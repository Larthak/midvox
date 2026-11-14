"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
        <AlertTriangle className="h-5 w-5" />
      </div>

      <h2 className="mt-4 text-xl font-semibold text-[var(--panel-ink)]">
        Something went wrong
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-6 text-[var(--panel-muted)]">
        This page could not load. Try again, or head back to your dashboard.
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-primary-light px-4 text-[13px] font-semibold text-[#171A12] transition-colors hover:bg-[#BACF7F]"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-[13px] font-semibold text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)]"
        >
          Back to dashboard
        </Link>
      </div>

      {process.env.NODE_ENV === "development" && (
        <pre className="mt-8 max-w-full overflow-auto rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-4 text-left text-xs text-red-600">
          {error.message}
        </pre>
      )}
    </div>
  );
}
