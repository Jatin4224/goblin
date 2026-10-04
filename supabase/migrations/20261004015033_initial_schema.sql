-- Goblin's whole schema, and its whole authorization layer.
--
-- Two things are true of every table here, and are meant to stay true:
--
--   1. A row belongs to exactly one organization, by foreign key, and the
--      organization's row going away takes the row with it.
--   2. Who may read it is decided by a policy below, reading the organization
--      claim off the auth token. No query anywhere needs a where clause to
--      come back with the right rows. If one does, the policy is wrong.
--
-- The migration ends with a guard that fails if any table in public is missing
-- either of those, because a table with security enabled and no policy returns
-- nothing (visible), while a table where someone forgot to enable it returns
-- everything (silent).

create schema if not exists app;

comment on schema app is
  'Helpers the policies call. Unlike public, not exposed over the API.';

-- Clerk issues two shapes of session token: v1 carries the organization in
-- org_id, v2 nests it as o.id. Both are read here, once, so that no policy has
-- to know which shape this instance happens to issue.
create or replace function app.current_org_id()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'org_id', ''),
    nullif(auth.jwt() -> 'o' ->> 'id', '')
  );
$$;

grant usage on schema app to authenticated;
grant execute on function app.current_org_id() to authenticated;

-- Clerk owns organizations. This is the local row the rest of the schema hangs
-- off, keyed by the Clerk id so that writing a child row needs no lookup, and
-- so that deleting it is what removes an organization's data.
create table public.organizations (
  id text primary key,
  created_at timestamptz not null default now()
);

-- A public GitHub repository someone pointed at. Stored as owner and name
-- rather than a URL: those two are what identify a repository, and a URL would
-- have to be normalised before it could be compared.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  owner text not null,
  name text not null,
  created_at timestamptz not null default now(),
  -- Children reference (organization_id, id) rather than id alone, so a child
  -- cannot be filed under an organization its parent does not belong to.
  unique (organization_id, id),
  unique (organization_id, owner, name)
);

-- One parse of one project.
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  project_id uuid not null,
  state text not null check (state in ('queued', 'parsing', 'ready', 'failed')),
  commit_sha text,
  failure_reason text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  foreign key (organization_id, project_id)
    references public.projects (organization_id, id) on delete cascade,
  unique (organization_id, id),
  -- A failed run has to say why. "failed" on its own is the kind of silence
  -- that costs an hour.
  constraint analyses_failed_rows_carry_a_reason
    check (state <> 'failed' or failure_reason is not null)
);

create index analyses_by_organization on public.analyses (organization_id, created_at desc);
create index analyses_by_project on public.analyses (organization_id, project_id);

-- Everything below belongs to one parse run, so it carries no created_at of
-- its own: the time it came into being is the analysis's.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  path text not null,
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade,
  unique (organization_id, id),
  unique (organization_id, analysis_id, path)
);

-- A resolved import. to_file_id is not nullable on purpose: an edge exists
-- because the parser resolved a real import to a real file. An unresolved
-- import is not a faint edge, it is not an edge.
create table public.edges (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  from_file_id uuid not null,
  to_file_id uuid not null,
  kind text not null check (kind in ('import', 're-export', 'dynamic-import', 'require')),
  -- What the source actually wrote, kept so that a resolution can be argued
  -- with.
  specifier text not null,
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade,
  foreign key (organization_id, from_file_id)
    references public.files (organization_id, id) on delete cascade,
  foreign key (organization_id, to_file_id)
    references public.files (organization_id, id) on delete cascade,
  -- Fan-in and fan-out are counted off these rows, so the same import written
  -- twice is one edge rather than two.
  unique (organization_id, analysis_id, from_file_id, to_file_id, kind, specifier)
);

create index edges_by_source on public.edges (organization_id, from_file_id);
create index edges_by_target on public.edges (organization_id, to_file_id);

-- A route the framework adapter recovered. Method and full path are both not
-- nullable: if either cannot be read off the syntax, the route is not stored at
-- all. An approximate route is an invented one.
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  method text not null
    check (method in ('GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
  path text not null check (path like '/%'),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade,
  foreign key (organization_id, file_id)
    references public.files (organization_id, id) on delete cascade,
  unique (organization_id, analysis_id, method, path)
);

create index routes_by_file on public.routes (organization_id, file_id);

-- What the model said about one file. One row per file is what makes the cache
-- a cache rather than a log.
create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  body text not null,
  model text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade,
  foreign key (organization_id, file_id)
    references public.files (organization_id, id) on delete cascade,
  unique (organization_id, file_id)
);

create index explanations_by_analysis on public.explanations (organization_id, analysis_id);

-- What sort of thing a file is, for the files convention could not place.
create table public.file_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  file_id uuid not null,
  role text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade,
  foreign key (organization_id, file_id)
    references public.files (organization_id, id) on delete cascade,
  unique (organization_id, file_id)
);

create index file_roles_by_analysis on public.file_roles (organization_id, analysis_id);

-- Something worth saying about the repository as a whole. Prose, never a score:
-- this explains a codebase, it does not grade one.
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  analysis_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (organization_id, analysis_id)
    references public.analyses (organization_id, id) on delete cascade
);

create index insights_by_analysis on public.insights (organization_id, analysis_id);

-- The policies. One per table, the same shape every time: the organization on
-- the row is the organization on the token. app.current_org_id() is wrapped in
-- a select so Postgres evaluates it once per query rather than once per row,
-- and the column it compares is the leading column of an index above.
--
-- A session with no organization makes the predicate null, which returns
-- nothing. That is the right answer, not an error to work around.

alter table public.organizations enable row level security;

create policy organizations_are_read_by_their_members on public.organizations
  for all
  to authenticated
  using (id = (select app.current_org_id()))
  with check (id = (select app.current_org_id()));

alter table public.projects enable row level security;

create policy projects_belong_to_an_organization on public.projects
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.analyses enable row level security;

create policy analyses_belong_to_an_organization on public.analyses
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.files enable row level security;

create policy files_belong_to_an_organization on public.files
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.edges enable row level security;

create policy edges_belong_to_an_organization on public.edges
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.routes enable row level security;

create policy routes_belong_to_an_organization on public.routes
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.explanations enable row level security;

create policy explanations_belong_to_an_organization on public.explanations
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.file_roles enable row level security;

create policy file_roles_belong_to_an_organization on public.file_roles
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

alter table public.insights enable row level security;

create policy insights_belong_to_an_organization on public.insights
  for all
  to authenticated
  using (organization_id = (select app.current_org_id()))
  with check (organization_id = (select app.current_org_id()));

-- The guard. Enabling security on a new table has to be impossible to forget
-- rather than unlikely to be forgotten, so this aborts the migration instead
-- of leaving behind a table that quietly answers everyone.
do $guard$
declare
  unguarded text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into unguarded
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and (
      not c.relrowsecurity
      or not exists (select 1 from pg_policy p where p.polrelid = c.oid)
    );

  if unguarded is not null then
    raise exception
      'these tables in public have no row level security or no policy: %',
      unguarded;
  end if;
end
$guard$;
