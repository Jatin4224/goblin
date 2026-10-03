import type { ReactNode } from "react";

/** A named region of the shell. Later phases fill these; they don't move them. */
export function Panel({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col">
      <h2 className="shrink-0 border-b border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-fg-faint">
        {name}
      </h2>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

/** What a panel says when it has nothing in it. Absent beats approximate. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-3 py-2 text-xs text-fg-muted">{children}</p>;
}
