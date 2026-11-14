import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDashboardAdmin } from "@/lib/admin";
import {
  canManageGuild,
  canManageRoles,
  fetchUserGuilds,
  isGuildAdministrator,
} from "@/lib/discord-access";

const API_URL = (
  process.env.API_INTERNAL_URL || "http://127.0.0.1:5001/api/v1"
).replace(/\/+$/, "");
const API_KEY = process.env.DASHBOARD_API_KEY?.trim();
const MAX_BODY_BYTES = 256 * 1024;
const RATE_WINDOW_MS = 60_000;
const READ_RATE_LIMIT = 120;
const MUTATION_RATE_LIMIT = 30;
const IP_RATE_LIMIT = 300;

const GUILD_MODULES = new Set([
  "channels",
  "roles",
  "prefix",
  "automod",
  "tickets",
  "leveling",
  "logging",
  "welcome",
  "antinuke",
  "verification",
  "vanityroles",
  "autorole",
  "tracking",
  "j2c",
  "joindm",
  "customroles",
  "autoreact",
  "invcrole",
  "reactionroles",
  "invites",
  "antispamplus",
  "instadl",
]);

const DISALLOWED_ROLE_PERMISSIONS = new Set(["kick_members", "ban_members"]);

type RouteInfo =
  | { kind: "bot" }
  | { kind: "adminNotification" }
  | { kind: "admin" }
  | { kind: "guildList" }
  | { kind: "guild"; guildId: string; module?: string; sub?: string };

type RateState = { count: number; resetAt: number };

const rateStates = new Map<string, RateState>();
let rateChecks = 0;

function jsonError(
  detail: string,
  status: number,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(
    { detail },
    {
      status,
      headers: { "Cache-Control": "no-store", ...(extraHeaders || {}) },
    },
  );
}

function clientIp(req: NextRequest): string {
  return (
    (req.headers.get("x-forwarded-for") || "").split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(
  key: string,
  limit: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  rateChecks += 1;

  if (rateChecks % 500 === 0) {
    for (const [storedKey, state] of rateStates) {
      if (state.resetAt <= now) rateStates.delete(storedKey);
    }
  }

  const state = rateStates.get(key);
  if (!state || state.resetAt <= now) {
    rateStates.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  state.count += 1;
  if (state.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, retryAfter: 0 };
}

function hasValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;

  const allowedOrigins = new Set<string>();
  try {
    allowedOrigins.add(new URL(req.url).origin);
  } catch {
    // Ignore malformed request URLs.
  }

  const configuredOrigin = process.env.NEXTAUTH_URL?.trim();
  if (configuredOrigin) {
    try {
      allowedOrigins.add(new URL(configuredOrigin).origin);
    } catch {
      // Ignore malformed configuration values.
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    allowedOrigins.add(`${forwardedProto}://${forwardedHost}`);
  }

  return allowedOrigins.has(origin);
}

function parseRoute(routePath: string): RouteInfo | null {
  const path = routePath.replace(/\/+$/, "") || "/";

  if (path === "/bot/status" || path === "/bot/info") {
    return { kind: "bot" };
  }
  if (path === "/admin/notification") {
    return { kind: "adminNotification" };
  }
  if (path === "/admin/stats" || path === "/admin/config") {
    return { kind: "admin" };
  }
  if (path === "/guilds") {
    return { kind: "guildList" };
  }

  const match = path.match(/^\/guilds\/(\d+)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!match) return null;

  const [, guildId, moduleName, sub] = match;
  if (!moduleName) return { kind: "guild", guildId };
  if (!GUILD_MODULES.has(moduleName)) return null;

  if (sub !== undefined) {
    if (moduleName === "roles") {
      if (!/^\d+$/.test(sub)) return null;
    } else if (moduleName === "leveling") {
      if (sub !== "leaderboard") return null;
    } else if (moduleName === "vanityroles") {
      if (!sub) return null;
    } else {
      return null;
    }
  }

  return { kind: "guild", guildId, module: moduleName, sub };
}

async function readBody(
  req: NextRequest,
): Promise<
  | { text: string; json: unknown }
  | { error: NextResponse }
> {
  const declaredLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { error: jsonError("Request body is too large", 413) };
  }

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: jsonError("Could not read the request body", 400) };
  }

  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { error: jsonError("Request body is too large", 413) };
  }

  if (!text) return { text: "", json: undefined };

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { error: jsonError("Request body must be valid JSON", 400) };
  }
}

async function proxy(
  req: NextRequest,
  params: { path: string[] },
  method: string,
) {
  if (!API_KEY) {
    return jsonError("Dashboard API key is not configured", 500);
  }

  let token: Awaited<ReturnType<typeof getToken>>;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });
  } catch {
    return jsonError("Could not verify your session", 401);
  }

  if (!token?.sub) {
    return jsonError("Sign in with Discord to continue", 401);
  }

  const accessToken =
    typeof token.accessToken === "string" ? token.accessToken : "";
  if (!accessToken) {
    return jsonError("Discord session expired. Sign in again", 401);
  }

  const isRead = method === "GET" || method === "HEAD";

  if (!isRead && !hasValidOrigin(req)) {
    return jsonError("Cross-site request blocked", 403);
  }

  const ip = clientIp(req);
  const ipLimit = checkRateLimit(`ip:${ip}`, IP_RATE_LIMIT);
  if (!ipLimit.allowed) {
    return jsonError("Too many requests", 429, {
      "Retry-After": String(ipLimit.retryAfter),
    });
  }

  const userLimit = checkRateLimit(
    `user:${token.sub}:${ip}`,
    isRead ? READ_RATE_LIMIT : MUTATION_RATE_LIMIT,
  );
  if (!userLimit.allowed) {
    return jsonError("Too many requests", 429, {
      "Retry-After": String(userLimit.retryAfter),
    });
  }

  if (
    params.path.length === 0 ||
    params.path.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\\"),
    )
  ) {
    return jsonError("Not found", 404);
  }

  const routePath = "/" + params.path.join("/");
  const route = parseRoute(routePath);
  if (!route) {
    return jsonError("Not found", 404);
  }

  let bodyText = "";
  let bodyJson: unknown;
  if (!isRead) {
    const parsedBody = await readBody(req);
    if ("error" in parsedBody) return parsedBody.error;
    bodyText = parsedBody.text;
    bodyJson = parsedBody.json;
  }

  if (route.kind === "admin" && !isDashboardAdmin(token.sub)) {
    return jsonError("Administrator access required", 403);
  }

  let guildList: Awaited<ReturnType<typeof fetchUserGuilds>> | undefined;

  if (route.kind === "guildList" || route.kind === "guild") {
    guildList = await fetchUserGuilds(accessToken);
    if (!guildList) {
      return jsonError("Discord session expired. Sign in again", 401);
    }
  }

  if (route.kind === "guild") {
    const guild = guildList?.find((item) => item.id === route.guildId);
    if (!guild) {
      return jsonError("Guild not found or you do not have access", 404);
    }
    if (!canManageGuild(guild)) {
      return jsonError("You need Manage Server permission for this guild", 403);
    }

    const roleMutation =
      !isRead && route.module === "roles";
    if (roleMutation) {
      if (!canManageRoles(guild)) {
        return jsonError("You need Manage Roles permission for this guild", 403);
      }

      const requestedPermissions = Array.isArray((bodyJson as any)?.permissions)
        ? ((bodyJson as any).permissions as unknown[]).map(String)
        : [];
      const blocked = requestedPermissions.filter((permission) =>
        DISALLOWED_ROLE_PERMISSIONS.has(permission),
      );
      if (blocked.length > 0) {
        return jsonError(
          "Ban and kick permissions are disabled for dashboard roles",
          400,
        );
      }

      const grantsAdministrator =
        (bodyJson as any)?.preset === "all" ||
        requestedPermissions.includes("administrator");
      if (grantsAdministrator && !isGuildAdministrator(guild)) {
        return jsonError(
          "Only the server owner or an administrator can grant Administrator permission",
          403,
        );
      }
    }
  }

  const endpoint =
    routePath +
    (req.nextUrl.pathname.endsWith("/") ? "/" : "") +
    req.nextUrl.search;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
  };
  if (!isRead && bodyText) {
    headers["Content-Type"] =
      req.headers.get("content-type") || "application/json";
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: isRead ? undefined : bodyText || undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(
        !isRead && route.kind === "guild" && route.module === "roles"
          ? 60_000
          : 20_000,
      ),
    });

    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    const contentType = response.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    if (route.kind === "guildList" && response.ok) {
      const data: unknown = await response.json();
      if (Array.isArray(data)) {
        const manageable = new Set(
          (guildList || []).filter(canManageGuild).map((guild) => guild.id),
        );
        return NextResponse.json(
          data.filter((item) => manageable.has(String((item as any)?.id))),
          { status: response.status, headers: responseHeaders },
        );
      }
      return NextResponse.json(data, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    const timedOut =
      error?.name === "TimeoutError" || error?.name === "AbortError";
    return jsonError(
      timedOut ? "The bot API timed out" : "Failed to reach the bot API",
      502,
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params, "GET");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params, "POST");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params, "PATCH");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params, "DELETE");
}
