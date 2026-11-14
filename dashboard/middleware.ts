import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDashboardAdmin } from "@/lib/admin";
import {
  canManageGuild,
  fetchUserGuilds,
  type DiscordGuildAccess,
} from "@/lib/discord-access";

const CACHE_TTL_MS = 30_000;
const CACHE_LIMIT = 100;

/** Screens that control the bot's own accounts, not a customer server. */
const OWNER_ONLY_PATH =
  /^\/dashboard\/(?:admin|discord-login|instagram-login|youtube-login)(?:\/|$)/;

type CacheEntry = {
  expiresAt: number;
  guilds: DiscordGuildAccess[] | null;
};

const guildCache = new Map<string, CacheEntry>();

async function guildsFor(accessToken: string): Promise<DiscordGuildAccess[] | null> {
  const now = Date.now();
  const cached = guildCache.get(accessToken);
  if (cached && cached.expiresAt > now) return cached.guilds;

  const guilds = await fetchUserGuilds(accessToken);

  if (guildCache.size >= CACHE_LIMIT) {
    guildCache.clear();
  }
  guildCache.set(accessToken, { expiresAt: now + CACHE_TTL_MS, guilds });
  return guilds;
}

export async function middleware(req: NextRequest) {
  let token: Awaited<ReturnType<typeof getToken>>;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
  } catch {
    token = null;
  }

  if (!token?.sub) {
    const signInUrl = new URL("/", req.url);
    signInUrl.searchParams.set(
      "callbackUrl",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }

  const accessToken =
    typeof token.accessToken === "string" ? token.accessToken : "";
  if (!accessToken) {
    return NextResponse.redirect(new URL("/no-access?reason=session", req.url));
  }

  const dashboardAdmin = isDashboardAdmin(token.sub);
  const { pathname } = req.nextUrl;

  // Only dashboard administrators and bot owners may open owner-only screens.
  if (OWNER_ONLY_PATH.test(pathname) && !dashboardAdmin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const guildMatch = pathname.match(/^\/dashboard\/guild\/(\d+)(?:\/|$)/);

  // Every dashboard route needs an access check. Administrators skip the
  // guild-list requirement, but guild pages are still checked individually below.
  let guilds: DiscordGuildAccess[] | null = null;
  if (!dashboardAdmin || guildMatch) {
    guilds = await guildsFor(accessToken);
    if (!guilds) {
      return NextResponse.redirect(new URL("/no-access?reason=verify", req.url));
    }
  }

  if (!dashboardAdmin && !guilds?.some(canManageGuild)) {
    return NextResponse.redirect(new URL("/no-access", req.url));
  }

  if (guildMatch) {
    const guild = guilds?.find((item) => item.id === guildMatch[1]);
    if (!guild || !canManageGuild(guild)) {
      return NextResponse.redirect(
        new URL("/dashboard/guilds?error=Forbidden", req.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
