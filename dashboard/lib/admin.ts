/**
 * Server-side dashboard administrator check.
 *
 * `NEXT_PUBLIC_ADMIN_IDS` is kept as a fallback for existing deployments, but
 * private `ADMIN_IDS` and `OWNER_IDS` take part too so the allowlist does not
 * have to be shipped in the browser bundle.
 */
export function isDashboardAdmin(userId?: string | null): boolean {
  if (!userId) return false;

  const ids = new Set(
    [process.env.ADMIN_IDS, process.env.NEXT_PUBLIC_ADMIN_IDS, process.env.OWNER_IDS]
      .flatMap((value) => (value || "").match(/\d{17,20}/g) || []),
  );

  return ids.has(userId);
}

/**
 * Bot owner check for the owner-only login screens. This intentionally does not
 * fall back to NEXT_PUBLIC_ADMIN_IDS: those routes control the bot's own
 * Discord, YouTube, and Instagram sessions.
 */
export function isBotOwner(userId?: string | null): boolean {
  if (!userId) return false;
  return (process.env.OWNER_IDS || "").match(/\d{17,20}/g)?.includes(userId) || false;
}
