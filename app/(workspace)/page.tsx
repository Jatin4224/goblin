import { ANALYSIS_LIST_LIMIT, isAnalysisState, listAnalyses, type Analysis } from "@/lib/analyses";

// Absolute UTC, not "2 hours ago": a relative time is wrong the moment a
// server-rendered page sits on screen, and a locale format differs between the
// machine that rendered it and the one reading it.
function formatTimestamp(iso: string) {
  const at = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`,
    `${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}Z`,
  ].join(" ");
}

// "created", not "started": a queued run has a created_at and no started_at,
// and a column heading that names a different column than the one underneath
// it is a small lie that gets believed.
//
// Widths are fixed rather than shrink-to-fit, so the columns sit in the same
// place in every organization and the eye can go straight down one of them.
const COLUMNS = [
  { name: "repository", width: "w-72" },
  { name: "state", width: "w-20" },
  { name: "commit", width: "w-24" },
  { name: "created", width: "w-40" },
  { name: "failure", width: "w-auto" },
] as const;

const CELL = "px-3 py-[0.3125rem] align-baseline";

// State is greyscale. Colour here would have to mean either direction or kind,
// and a run's state is neither; what a run is still doing is said by setting it
// back, and what went wrong is said in words by the last column.
function stateClass(state: string) {
  if (!isAnalysisState(state) || state === "queued" || state === "parsing") {
    return "text-fg-muted";
  }

  return "text-fg";
}

function Absent() {
  return <span className="text-fg-faint">—</span>;
}

function AnalysisRow({ analysis }: { analysis: Analysis }) {
  return (
    <tr className="border-b border-line">
      <td className={`${CELL} truncate font-mono text-xs`}>
        {analysis.repository ? (
          <>
            {/* The owner repeats down the column and the name is what's being
                looked for, so the name carries the weight. */}
            <span className="text-fg-muted">{analysis.repository.owner}/</span>
            <span className="text-fg">{analysis.repository.name}</span>
          </>
        ) : (
          <Absent />
        )}
      </td>

      <td className={`${CELL} font-mono text-xs ${stateClass(analysis.state)}`}>{analysis.state}</td>

      <td className={`${CELL} font-mono text-xs tabular-nums text-fg-muted`}>
        {/* Short form, as every other tool shows it. Absent if the run never
            got as far as resolving one. */}
        {analysis.commitSha ? analysis.commitSha.slice(0, 7) : <Absent />}
      </td>

      <td className={`${CELL} font-mono text-xs tabular-nums text-fg-muted`}>
        {formatTimestamp(analysis.createdAt)}
      </td>

      <td className={`${CELL} text-xs text-fg-muted`}>
        {/* The column takes what's left of the row, but the sentence inside it
            stops at a readable line rather than running the whole width. */}
        {analysis.failureReason ? (
          <span className="block max-w-[64ch]">{analysis.failureReason}</span>
        ) : (
          <Absent />
        )}
      </td>
    </tr>
  );
}

export default async function DashboardPage() {
  const result = await listAnalyses();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface px-3 py-1">
        <h1 className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-faint">analyses</h1>
        {result.read ? (
          <span className="font-mono text-[10px] tabular-nums text-fg-faint">
            {result.analyses.length}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* A failed read is not an empty organization. Saying which is which is
            the difference between a missing policy and a team that hasn't run
            anything. */}
        {!result.read ? (
          <div className="max-w-[60ch] px-3 py-2 text-xs">
            <p className="text-fg">The analyses couldn&apos;t be read.</p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-fg-muted">
              {result.reason}
            </p>
          </div>
        ) : result.analyses.length === 0 ? (
          <div className="max-w-[60ch] px-3 py-2 text-xs">
            <p className="text-fg-muted">No analyses in this organization yet.</p>
            <p className="mt-1 text-fg-faint">
              A run appears here as soon as a repository has been parsed for this team.
            </p>
          </div>
        ) : (
          <>
            <table className="w-full table-fixed border-collapse text-left">
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.name} className={column.width} />
                ))}
              </colgroup>

              {/* Stays put while the list scrolls under it. */}
              <thead className="sticky top-0 z-10 bg-sunken">
                <tr className="border-b border-line-strong">
                  {COLUMNS.map((column) => (
                    <th
                      key={column.name}
                      className={`${CELL} font-mono text-[10px] font-normal uppercase tracking-[0.08em] text-fg-faint`}
                    >
                      {column.name}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.analyses.map((analysis) => (
                  <AnalysisRow key={analysis.id} analysis={analysis} />
                ))}
              </tbody>
            </table>

            {result.analyses.length === ANALYSIS_LIST_LIMIT ? (
              <p className="px-3 py-1 font-mono text-[10px] text-fg-faint">
                showing the {ANALYSIS_LIST_LIMIT} most recent
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
