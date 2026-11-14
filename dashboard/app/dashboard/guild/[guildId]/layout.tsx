import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Server, Settings, ShieldAlert } from "lucide-react";
import { canManageGuild } from "@/lib/discord-access";
import { requireDashboardAccess } from "@/lib/dashboard-access";
import { api } from "@/lib/api";

export const revalidate = 0;

interface GuildLayoutProps {
  children: React.ReactNode;
  params: { guildId: string };
}

export default async function GuildLayout({ children, params }: GuildLayoutProps) {
  const guildId = params.guildId;
  const { guilds } = await requireDashboardAccess();

  let guild;
  let error = null;

  const guildAccess = guilds.find((item) => item.id === guildId);
  if (!guildAccess || !canManageGuild(guildAccess)) {
    error = "You need Manage Server or Administrator permission for this server.";
  } else {
    try {
      guild = await api.getGuildDetails(guildId);
    } catch (err: any) {
      console.error("Failed to fetch guild details:", err);
      error = err?.message || "We could not load this server just now.";
    }
  }

  if (error || !guild) {
    return (
      <div className="panel-surface flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-8 text-center sm:p-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--panel-ink)]">
          Access denied
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-6 text-[var(--panel-muted)]">
          {error || "This server does not exist or you do not have permission to manage it."}
        </p>
        <Link
          href="/dashboard/guilds"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-5 text-[13px] font-semibold text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)]"
        >
          Back to servers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="panel-divider flex min-h-10 flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Link
            href="/dashboard/guilds"
            className="flex items-center gap-1.5 font-medium text-[var(--panel-muted)] transition-colors hover:text-[var(--panel-ink)]"
          >
            <Server className="h-3.5 w-3.5" />
            Servers
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 text-[var(--panel-faint)]" />
          <div className="flex min-w-0 items-center gap-2 font-semibold text-[var(--panel-ink)]">
            {guild.icon ? (
              <Image
                src={guild.icon}
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 rounded-lg border border-[var(--panel-line)]"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--panel-accent)] text-[11px] font-bold text-[#171a12]">
                {guild.name.charAt(0)}
              </span>
            )}
            <span className="truncate">{guild.name}</span>
          </div>
          <span className="panel-status-pill ml-1 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Bot connected
          </span>
        </div>

        <Link
          href={`/dashboard/guild/${guildId}/settings`}
          className="panel-surface flex w-fit shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[var(--panel-muted)] transition-colors hover:text-[var(--panel-ink)]"
        >
          <Settings className="h-3.5 w-3.5" />
          Server settings
        </Link>
      </div>

      <div className="min-h-[500px]">{children}</div>
    </div>
  );
}
