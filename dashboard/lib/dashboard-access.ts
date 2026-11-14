import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isBotOwner, isDashboardAdmin } from "@/lib/admin";
import {
  canManageGuild,
  fetchUserGuilds,
  type DiscordGuildAccess,
} from "@/lib/discord-access";

export type DashboardAccess = {
  session: Session;
  guilds: DiscordGuildAccess[];
  isAdmin: boolean;
};

/**
 * Server-side dashboard gate.
 *
 * A signed-in Discord account only counts as a dashboard user when it is on the
 * dashboard admin allowlist or can manage at least one server. Middleware blocks
 * these requests first; this check keeps the pages safe if middleware is ever
 * bypassed or misconfigured.
 */
export async function requireDashboardAccess(): Promise<DashboardAccess> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const accessToken = (session as Session & { accessToken?: string }).accessToken;
  if (!accessToken) redirect("/no-access?reason=session");

  const guilds = await fetchUserGuilds(accessToken);
  if (!guilds) redirect("/no-access?reason=verify");

  const isAdmin = isDashboardAdmin(session.user.id);
  if (!isAdmin && !guilds.some(canManageGuild)) redirect("/no-access");

  return { session, guilds, isAdmin };
}

/** Owner-only screens for the bot's own Discord, YouTube, and Instagram logins. */
export async function requireBotOwner(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");
  if (!isBotOwner(session.user.id)) redirect("/dashboard");
  return session;
}
