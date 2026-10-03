import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

import { Panel, PanelEmpty } from "@/components/shell/panel";
import { ThemeControl } from "@/components/theme-control";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  // Read off the session token during the render. No request to Clerk, which
  // is what keeps every later authorization decision a claim rather than a
  // question asked at runtime. The name is a claim too, added to the token in
  // the instance config rather than looked up here.
  const { orgId, sessionClaims } = await auth();

  // Checked at runtime, not by a type: Clerk types session claims loosely
  // enough that a misspelled claim name still compiles.
  const claimedName: unknown = sessionClaims?.org_name;
  const orgName = typeof claimedName === "string" && claimedName !== "" ? claimedName : null;

  return (
    <div className="grid h-full grid-rows-[2.25rem_minmax(0,1fr)_1.5rem]">
      <header className="flex items-center justify-between border-b border-line bg-surface px-3">
        <span className="font-mono text-xs text-fg-muted">goblin</span>

        <div className="flex items-center gap-3">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            afterLeaveOrganizationUrl="/"
          />
          <ThemeControl />
          <UserButton />
        </div>
      </header>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-h-0 overflow-auto bg-sunken">{children}</main>

        <aside className="grid min-h-0 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] border-l border-line bg-surface">
          <Panel name="detail">
            <PanelEmpty>No file selected.</PanelEmpty>
          </Panel>

          <div className="grid min-h-0 border-t border-line">
            <Panel name="chat">
              <PanelEmpty>Nothing parsed to ask about yet.</PanelEmpty>
            </Panel>
          </div>
        </aside>
      </div>

      <footer className="flex items-center justify-between border-t border-line bg-surface px-3 font-mono text-[11px] text-fg-muted">
        {/* Falls back to the id rather than to a placeholder: if the name
            claim isn't configured, say what the token actually carries. */}
        <span>{orgId ? `org ${orgName ?? orgId}` : "no organization on this session"}</span>
        <span className="text-fg-faint">no repository parsed</span>
      </footer>
    </div>
  );
}
