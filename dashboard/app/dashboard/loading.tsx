import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--panel-accent-deep)]" />
      <p className="text-sm font-semibold text-[var(--panel-ink)]">Loading this page</p>
      <p className="text-xs text-[var(--panel-muted)]">
        Fetching the latest data from Discord.
      </p>
    </div>
  );
}
