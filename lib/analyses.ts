import "server-only";

import { supabaseForRequest } from "@/lib/supabase/server";

/**
 * The states a run can be in. The column is checked against the same four, so
 * this list and the database can't drift apart quietly.
 */
export const ANALYSIS_STATES = ["queued", "parsing", "ready", "failed"] as const;

export type AnalysisState = (typeof ANALYSIS_STATES)[number];

export function isAnalysisState(value: string): value is AnalysisState {
  return (ANALYSIS_STATES as readonly string[]).includes(value);
}

export type Analysis = {
  id: string;
  /** Left as the column's own text. An unrecognised state is shown, not mapped. */
  state: string;
  /** Owner and name stay apart: the list sets them differently to scan down. */
  repository: { owner: string; name: string } | null;
  commitSha: string | null;
  createdAt: string;
  finishedAt: string | null;
  failureReason: string | null;
};

/**
 * Either the rows, or why there are none. An empty list and a failed read look
 * identical on screen otherwise, and they mean completely different things.
 */
export type AnalysisList =
  | { read: true; analyses: Analysis[] }
  | { read: false; reason: string };

// A list read is bounded. Nothing here needs every row an organization has
// ever produced, and an unbounded select is how that stops being true. It is
// exported so the page can say when it is showing a window rather than all of
// them.
export const ANALYSIS_LIST_LIMIT = 50;

export async function listAnalyses(): Promise<AnalysisList> {
  const supabase = await supabaseForRequest();

  // There is no organization filter here on purpose. The policy on the table
  // decides which rows come back, and switching organization changes the
  // answer without this query changing. If another organization's row ever
  // appeared, the policy is the bug — a where clause would only hide it.
  const { data, error } = await supabase
    .from("analyses")
    .select("id, state, commit_sha, created_at, finished_at, failure_reason, projects(owner, name)")
    .order("created_at", { ascending: false })
    .limit(ANALYSIS_LIST_LIMIT);

  if (error) {
    return { read: false, reason: error.message };
  }

  return {
    read: true,
    analyses: data.map((row) => ({
      id: row.id,
      state: row.state,
      repository: row.projects ? { owner: row.projects.owner, name: row.projects.name } : null,
      commitSha: row.commit_sha,
      createdAt: row.created_at,
      finishedAt: row.finished_at,
      failureReason: row.failure_reason,
    })),
  };
}
