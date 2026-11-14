import { NextResponse } from "next/server";

// Read the client ID from the runtime environment on every request. Without
// this the route handler can be cached as a static response and keep serving an
// outdated invite link after a deployment.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Curated permissions: no Administrator, Ban Members, or Kick Members.
// The bot keeps the moderation, channel, role, webhook, and voice access it
// needs without being able to remove members from a server.
const INVITE_PERMISSIONS = "1644904836849";

export function GET() {
  const clientId =
    process.env["DISCORD_CLIENT_ID"]?.trim() ||
    process.env["NEXT_PUBLIC_DISCORD_CLIENT_ID"]?.trim() ||
    "";

  if (!/^\d+$/.test(clientId)) {
    return NextResponse.json(
      { error: "Discord client ID is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const inviteUrl = new URL("https://discord.com/oauth2/authorize");
  inviteUrl.searchParams.set("client_id", clientId);
  inviteUrl.searchParams.set("permissions", INVITE_PERMISSIONS);
  inviteUrl.searchParams.set("integration_type", "0");
  inviteUrl.searchParams.set("scope", "bot applications.commands");

  return NextResponse.redirect(inviteUrl, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
    },
  });
}
