import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  canManageGuild,
  fetchUserGuilds,
  type DiscordGuildAccess,
} from "@/lib/discord-access";

const CACHE_TTL_MS = 30_000;
const CACHE_LIMIT = 100;

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
    return NextResponse.redirect(new URL("/?error=SessionExpired", req.url));
  }

  const guildMatch = req.nextUrl.pathname.match(
    /^\/dashboard\/guild\/(\d+)(?:\/|$)/,
  );
  if (guildMatch) {
    const guilds = await guildsFor(accessToken);
    if (!guilds) {
      return NextResponse.redirect(new URL("/?error=SessionExpired", req.url));
    }

    const guild = guilds.find((item) => item.id === guildMatch[1]);
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
