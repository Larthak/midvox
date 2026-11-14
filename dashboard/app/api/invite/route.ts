import { NextResponse } from "next/server";

export function GET() {
  const clientId =
    process.env["DISCORD_CLIENT_ID"]?.trim() ||
    process.env["NEXT_PUBLIC_DISCORD_CLIENT_ID"]?.trim() ||
    "";

  if (!/^\d+$/.test(clientId)) {
    return NextResponse.json(
      { error: "Discord client ID is not configured." },
      { status: 503 },
    );
  }

  // Curated permissions: no Administrator, Ban Members, or Kick Members.
  // The bot keeps the moderation, channel, role, webhook, and voice access it
  // needs without being able to remove members from a server.
  const inviteUrl = new URL("https://discord.com/oauth2/authorize");
  inviteUrl.searchParams.set("client_id", clientId);
  inviteUrl.searchParams.set("permissions", "1644904836849");
  inviteUrl.searchParams.set("integration_type", "0");
  inviteUrl.searchParams.set("scope", "bot applications.commands");

  return NextResponse.redirect(inviteUrl);
}
