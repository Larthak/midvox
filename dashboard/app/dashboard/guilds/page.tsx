import Link from "next/link";
import { Plus, Server, ShieldAlert } from "lucide-react";
import { canManageGuild } from "@/lib/discord-access";
import { requireDashboardAccess } from "@/lib/dashboard-access";
import { api } from "@/lib/api";
import { ServerCard } from "@/components/dashboard/server-card";
import type { GuildSummary } from "@/types/api";

export const dynamic = "force-dynamic";

type GuildsPageProps = {
  searchParams: { error?: string };
};

export default async function GuildsPage({ searchParams }: GuildsPageProps) {
  const { guilds: discordGuilds } = await requireDashboardAccess();

  let guilds: GuildSummary[] = [];
  let error = "";

  const manageable = new Set(
    discordGuilds.filter(canManageGuild).map((guild) => guild.id),
  );

  if (manageable.size > 0) {
    try {
      guilds = (await api.listGuilds()).filter((guild) =>
        manageable.has(String(guild.id)),
      );
    } catch (err: any) {
      console.error("Failed to fetch guilds:", err);
      error = err?.message || "We could not load your servers just now.";
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--panel-accent-deep)]">Servers</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--panel-ink)] sm:text-[28px]">
            Your servers
          </h1>
          <p className="mt-1.5 text-sm text-[var(--panel-muted)]">
            Choose a server where you have Manage Server or Administrator permission.
          </p>
        </div>

        <a
          href="/api/invite"
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--panel-line)] bg-[var(--panel-paper)] px-4 text-[13px] font-semibold text-[var(--panel-muted)] transition-colors hover:border-[var(--panel-accent)] hover:text-[var(--panel-ink)] sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add MidVox
        </a>
      </header>

      {searchParams.error === "Forbidden" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <p className="text-[13px] font-semibold text-[var(--panel-ink)]">
              That server is not available to your account
            </p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--panel-muted)]">
              You need Manage Server or Administrator permission on that server.
            </p>
          </div>
        </div>
      )}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-[13px] text-[var(--panel-ink)]">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">We could not load your servers</p>
            <p className="mt-0.5 text-xs leading-5 text-[var(--panel-muted)]">{error}</p>
            <Link
              href="/dashboard/guilds"
              className="mt-2 inline-block text-xs font-semibold text-[var(--panel-accent-deep)] hover:underline"
            >
              Try again
            </Link>
          </div>
        </div>
      ) : guilds.length === 0 ? (
        <div className="panel-surface flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--panel-line)] bg-[var(--panel-raised)] text-[var(--panel-muted)]">
            <Server className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-[var(--panel-ink)]">
            No servers to show
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--panel-muted)]">
            MidVox is not connected to a server where you have Manage Server or
            Administrator permission.
          </p>
          <a
            href="/api/invite"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary-light px-5 text-[13px] font-semibold text-[#171A12] transition-colors hover:bg-[#BACF7F]"
          >
            <Plus className="h-4 w-4" />
            Add MidVox to a server
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {guilds.map((guild) => (
            <ServerCard
              key={guild.id}
              id={guild.id}
              name={guild.name}
              iconUrl={guild.icon_url}
              memberCount={guild.member_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
