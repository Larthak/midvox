import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export type LegalSection = {
  title: string;
  icon: LucideIcon;
  body: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
}: LegalPageProps) {
  return (
    <div className="panel-shell min-h-screen">
      <header className="panel-topbar sticky top-0 z-30">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label={`${BRAND_NAME} homepage`}
          >
            <span className="panel-brand-mark">m</span>
            <span className="panel-brand-name text-sm font-bold">
              {BRAND_NAME}
            </span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--panel-muted)] transition-colors hover:text-[var(--panel-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold text-[var(--panel-accent-deep)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--panel-ink)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--panel-muted)]">
          {intro}
        </p>
        <p className="mt-2 text-xs text-[var(--panel-faint)]">
          Last updated {updated}
        </p>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="panel-surface rounded-2xl p-5 sm:p-6"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-accent-deep)]">
                  <section.icon className="h-4 w-4" />
                </span>
                <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
                  {section.title}
                </h2>
              </div>

              <div className="mt-3 space-y-2.5">
                {section.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-6 text-[var(--panel-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-semibold text-[var(--panel-ink)]">
              Questions about this page?
            </p>
            <p className="mt-0.5 text-xs text-[var(--panel-muted)]">
              Ask in the Discord server where you use {BRAND_NAME}.
            </p>
          </div>
          <Link
            href="/docs"
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-xs font-semibold text-[var(--panel-ink)] transition-colors hover:border-[var(--panel-accent)]"
          >
            Read the documentation
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--panel-line)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 py-6 text-xs text-[var(--panel-faint)] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            © {new Date().getFullYear()} {BRAND_NAME}
          </p>
          <div className="flex items-center gap-4">
            <Link href="/docs" className="hover:text-[var(--panel-ink)]">
              Docs
            </Link>
            <Link href="/privacy" className="hover:text-[var(--panel-ink)]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--panel-ink)]">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
