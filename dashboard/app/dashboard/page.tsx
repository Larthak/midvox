export const dynamic = "force-dynamic";

import React from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  FileText,
  Plus,
  Server as ServerIcon,
  ShieldAlert,
  Users,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { requireDashboardAccess } from "@/lib/dashboard-access";
import { MetricCard } from "@/components/dashboard/metric-card";

export default async function DashboardPage() {
  await requireDashboardAccess();

  let botInfo;
  let error = null;

  try {
    botInfo = await api.getBotInfo();
  } catch (err: any) {
    console.error("Failed to fetch bot info:", err);
    error = err?.message || "The bot API did not respond.";
    botInfo = {
      name: "MidVox",
      guilds: 0,
      users: 0,
      commands: 0,
      latency: "—",
    };
  }

  const stats = [
    { name: "Servers", value: botInfo.guilds, icon: <ServerIcon className="h-5 w-5 text-[var(--panel-accent-deep)]" /> },
    { name: "Members reached", value: botInfo.users, icon: <Users className="h-5 w-5 text-[var(--panel-accent-deep)]" /> },
    { name: "Commands loaded", value: botInfo.commands, icon: <Zap className="h-5 w-5 text-[var(--panel-accent-deep)]" /> },
    { name: "API latency", value: botInfo.latency, icon: <Activity className="h-5 w-5 text-[var(--panel-accent-deep)]" /> },
  ];

  const quickActions = [
    {
      title: "Manage your servers",
      description: "Open a server and update its modules and settings.",
      href: "/dashboard/guilds",
      icon: ServerIcon,
    },
    {
      title: "Read the documentation",
      description: "Short guides for every dashboard module.",
      href: "/docs",
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-medium text-[var(--panel-accent-deep)]">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--panel-ink)] sm:text-[28px]">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-[var(--panel-muted)]">
          Bot health and activity across every server you manage.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--panel-ink)]">
              Live data is temporarily unavailable
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--panel-muted)]">
              Some numbers may be out of date. {error}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard
            key={stat.name}
            name={stat.name}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="panel-surface rounded-2xl p-5 sm:p-6 lg:col-span-2">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
              Quick actions
            </h2>
            <p className="mt-1 text-xs text-[var(--panel-muted)]">
              Jump to the things you use most.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {quickActions.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3.5 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] p-4 transition-colors hover:border-[var(--panel-accent)] hover:bg-[var(--panel-paper)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--panel-paper)] text-[var(--panel-accent-deep)] shadow-[0_1px_2px_rgba(25,27,20,0.05)]">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--panel-ink)]">
                    {item.title}
                    <ArrowRight className="h-3.5 w-3.5 text-[var(--panel-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--panel-accent-deep)]" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--panel-muted)]">
                    {item.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <a
            href="/api/invite"
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--panel-line)] px-4 py-3 text-[13px] font-medium text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)]"
          >
            <Plus className="h-4 w-4 text-[var(--panel-accent-deep)]" />
            Add MidVox to another server
            <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </a>
        </section>

        <section className="panel-surface rounded-2xl p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-[var(--panel-ink)]">
            Bot status
          </h2>
          <p className="mt-1 text-xs text-[var(--panel-muted)]">
            A live snapshot from the MidVox API.
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] px-3.5 py-3">
              <span className="text-[13px] font-medium text-[var(--panel-ink)]">
                Gateway
              </span>
              <span
                className={
                  error
                    ? "inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-600"
                    : "panel-status-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {error ? "Unavailable" : "Connected"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] px-3.5 py-3">
              <span className="text-[13px] font-medium text-[var(--panel-ink)]">
                API latency
              </span>
              <span className="text-[13px] tabular-nums text-[var(--panel-muted)]">
                {botInfo.latency}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--panel-line)] bg-[var(--panel-raised)] px-3.5 py-3">
              <span className="text-[13px] font-medium text-[var(--panel-ink)]">
                Commands loaded
              </span>
              <span className="text-[13px] tabular-nums text-[var(--panel-muted)]">
                {botInfo.commands.toLocaleString()}
              </span>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[var(--panel-faint)]">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This snapshot refreshes whenever you reload the page.
          </p>
        </section>
      </div>
    </div>
  );
}
