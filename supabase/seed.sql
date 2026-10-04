-- Seeded rows, because nothing creates a real analysis yet.
--
-- Only organizations, projects and analyses are seeded. Files, edges and
-- routes are not: no parser has run, and inventing a dependency graph to fill
-- the screen is the one thing this app must never do.
--
-- Ids are fixed literals and every insert is idempotent, so running this twice
-- doesn't produce a second copy of the same run.
--
-- The first organization is a real Clerk organization. The second is not: it
-- stands in for another team, and its rows exist to be absent from the query
-- rather than hidden by the interface. Replace it with a second Clerk
-- organization id to watch the list change when you switch.

insert into public.organizations (id) values
  ('org_3KBYdnTEWIbks4wikv0C3vJpnPA'),
  ('org_seed_another_team')
on conflict (id) do nothing;

insert into public.projects (id, organization_id, owner, name) values
  ('0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c61', 'org_3KBYdnTEWIbks4wikv0C3vJpnPA', 'vercel', 'next.js'),
  ('0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c62', 'org_3KBYdnTEWIbks4wikv0C3vJpnPA', 'honojs', 'hono'),
  ('0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c63', 'org_seed_another_team', 'tldraw', 'tldraw')
on conflict (id) do nothing;

insert into public.analyses
  (id, organization_id, project_id, state, commit_sha, failure_reason, created_at, started_at, finished_at)
values
  (
    '1f4b2d8d-8c4f-4b3a-8c6d-2e3f4a5b6c71',
    'org_3KBYdnTEWIbks4wikv0C3vJpnPA',
    '0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c61',
    'ready',
    'a3f91c2e8b7d4f6a9c0b1e2d3f4a5b6c7d8e9f01',
    null,
    now() - interval '2 hours',
    now() - interval '2 hours',
    now() - interval '1 hour 52 minutes'
  ),
  (
    '1f4b2d8d-8c4f-4b3a-8c6d-2e3f4a5b6c72',
    'org_3KBYdnTEWIbks4wikv0C3vJpnPA',
    '0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c62',
    'parsing',
    'b7c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
    null,
    now() - interval '4 minutes',
    now() - interval '4 minutes',
    null
  ),
  (
    '1f4b2d8d-8c4f-4b3a-8c6d-2e3f4a5b6c73',
    'org_3KBYdnTEWIbks4wikv0C3vJpnPA',
    '0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c62',
    'failed',
    null,
    'Repository is larger than one request can parse.',
    now() - interval '1 day',
    now() - interval '1 day',
    now() - interval '23 hours 58 minutes'
  ),
  (
    '1f4b2d8d-8c4f-4b3a-8c6d-2e3f4a5b6c74',
    'org_seed_another_team',
    '0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c63',
    'ready',
    'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0',
    null,
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '2 days 23 hours 41 minutes'
  ),
  (
    '1f4b2d8d-8c4f-4b3a-8c6d-2e3f4a5b6c75',
    'org_seed_another_team',
    '0e3a1c7c-7b3e-4a2f-9b5c-1d2f3a4b5c63',
    'queued',
    null,
    null,
    now() - interval '1 minute',
    null,
    null
  )
on conflict (id) do nothing;
