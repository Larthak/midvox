import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { ArrowLeft, CircleCheck, LockKeyhole, Server } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { BRAND_NAME } from "@/lib/brand";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Dashboard access",
};

type NoAccessPageProps = {
  searchParams: { reason?: string };
};

export default async function NoAccessPage({ searchParams }: NoAccessPageProps) {
  const session = await getServerSession(authOptions);
  const reason = searchParams.reason;

  const message =
    reason === "session"
      ? "Your Discord session has expired. Sign in again so we can verify which servers you manage."
      : reason === "verify"
        ? "We could not verify your servers with Discord just now. This is usually temporary — sign in again to retry."
        : "The MidVox dashboard is available to server managers. Your Discord account needs the Manage Server or Administrator permission on a server that uses MidVox.";

  const actionLabel =
    reason === "session" || reason === "verify"
      ? "Sign in again"
      : "Use a different account";

  return (
    <div className="panel-shell flex min-h-screen items-center justify-center px-5 py-12">
      <main className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[var(--panel-ink)]"
          aria-label={`${BRAND_NAME} homepage`}
        >
          <span className="panel-brand-mark">m</span>
          <span className="panel-brand-name text-base font-bold">{BRAND_NAME}</span>
        </Link>

        <section className="panel-surface mt-6 rounded-3xl p-7 sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
            <LockKeyhole className="h-5 w-5" />
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--panel-ink)]">
            {reason === "session" || reason === "verify"
              ? "We could not verify your access"
              : "You do not have dashboard access"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--panel-muted)]">
            {message}
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-4">
            <p className="text-xs font-semibold text-[var(--panel-ink)]">
              To open the dashboard, you need one of these:
            </p>
            <ul className="mt-3 space-y-2.5 text-xs text-[var(--panel-muted)]">
              <li className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--panel-accent-deep)]" />
                <span>Manage Server or Administrator on a server where MidVox is installed.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--panel-accent-deep)]" />
                <span>Or membership on the MidVox dashboard administrator allowlist.</span>
              </li>
            </ul>
          </div>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <SignOutButton label={actionLabel} />
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-5 text-sm font-semibold text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-between gap-4 border-t border-[var(--panel-line)] pt-5 text-xs text-[var(--panel-faint)]">
            <span>
              {session?.user?.name
                ? `Signed in as ${session.user.name}`
                : "Not signed in"}
            </span>
            <Link
              href="/api/invite"
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--panel-muted)] transition-colors hover:text-[var(--panel-ink)]"
            >
              <Server className="h-3.5 w-3.5" />
              Add MidVox
            </Link>
          </div>
        </section>

        <p className="mx-auto mt-5 max-w-md text-center text-xs leading-5 text-[var(--panel-faint)]">
          If you believe this is a mistake, ask a server owner to check your
          permissions, then sign in again.
        </p>
      </main>
    </div>
  );
}
