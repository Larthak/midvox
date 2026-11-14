const DISCORD_API = "https://discord.com/api/v10";

const ADMINISTRATOR = BigInt(8);
const MANAGE_GUILD = BigInt(32);
const MANAGE_ROLES = BigInt(268435456);

export type DiscordGuildAccess = {
  id: string;
  name?: string;
  owner?: boolean;
  permissions?: string;
};

/**
 * Fetch the guilds the signed-in Discord user belongs to. The OAuth token is
 * only ever used on the server and is never exposed to the browser.
 */
export async function fetchUserGuilds(
  accessToken: string,
): Promise<DiscordGuildAccess[] | null> {
  if (!accessToken) return null;

  try {
    const response = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return null;

    return data.filter(
      (item): item is DiscordGuildAccess =>
        Boolean(item) && typeof (item as DiscordGuildAccess).id === "string",
    );
  } catch {
    return null;
  }
}

export function guildPermissions(guild?: DiscordGuildAccess | null): bigint {
  try {
    return BigInt(guild?.permissions || "0");
  } catch {
    return BigInt(0);
  }
}

export function isGuildAdministrator(
  guild?: DiscordGuildAccess | null,
): boolean {
  if (!guild) return false;
  return Boolean(guild.owner) || (guildPermissions(guild) & ADMINISTRATOR) !== BigInt(0);
}

export function canManageGuild(guild?: DiscordGuildAccess | null): boolean {
  if (!guild) return false;
  const permissions = guildPermissions(guild);
  return (
    Boolean(guild.owner) ||
    (permissions & ADMINISTRATOR) !== BigInt(0) ||
    (permissions & MANAGE_GUILD) !== BigInt(0)
  );
}

export function canManageRoles(guild?: DiscordGuildAccess | null): boolean {
  if (!guild) return false;
  const permissions = guildPermissions(guild);
  return (
    Boolean(guild.owner) ||
    (permissions & ADMINISTRATOR) !== BigInt(0) ||
    (permissions & MANAGE_ROLES) !== BigInt(0)
  );
}
