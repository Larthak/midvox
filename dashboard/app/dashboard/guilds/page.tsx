import { Server, ShieldAlert } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canManageGuild, fetchUserGuilds } from "@/lib/discord-access";
import { api } from "@/lib/api";
import { ServerCard } from "@/components/dashboard/server-card";
import type { GuildSummary } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function GuildsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/");
  }

  let guilds: GuildSummary[] = [];
  let error = "";

  const accessToken = (session as any).accessToken as string | undefined;
  if (!accessToken) {
    error = "Sign in with Discord again to load your servers.";
  } else {
    const discordGuilds = await fetchUserGuilds(accessToken);
    if (!discordGuilds) {
      error = "Could not verify your Discord servers. Sign in again.";
    } else {
      const manageable = new Set(
        discordGuilds.filter(canManageGuild).map((guild) => guild.id),
      );

      if (manageable.size === 0) {
        guilds = [];
      } else {
        try {
          guilds = (await api.listGuilds()).filter((guild) =>
            manageable.has(String(guild.id)),
          );
        } catch (err: any) {
          console.error("Failed to fetch guilds:", err);
          error = err?.message || "Failed to load your servers.";
        }
      }
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Servers</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-50">Your servers</h1>
        <p className="mt-1 text-sm text-neutral-500">Choose a server where you have Manage Server or Administrator permission.</p>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : guilds.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-[#1A1A1A] bg-[#111111] p-8 text-center">
          <Server className="mb-3 h-8 w-8 text-neutral-600" />
          <h2 className="font-semibold text-slate-50">No manageable servers</h2>
          <p className="mt-2 max-w-sm text-sm text-neutral-500">The bot is not connected to a server where you have Manage Server or Administrator permission.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
