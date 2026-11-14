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
