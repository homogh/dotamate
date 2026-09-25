// Multi-server + needed-position helpers for Post. Pure functions (no prisma)
// so API routes and client pages can share them.

export const POSITION_VALUES = ["POS1", "POS2", "POS3", "POS4", "POS5"] as const;
export const REGION_VALUES = ["EU_WEST", "EU_EAST", "RUSSIA", "DUBAI"] as const;

// Json column → clean, de-duplicated list of allowed enum values, in the
// canonical order of `allowed`.
export function parseEnumList(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const picked = new Set(value.map(String));
  return allowed.filter((v) => picked.has(v));
}

// Older rows only have the single `region` column.
export function postRegions(post: { region: string; regions?: unknown }): string[] {
  const list = parseEnumList(post.regions, REGION_VALUES);
  return list.length ? list : [post.region];
}

export function postNeededPositions(post: { neededPositions?: unknown }): string[] {
  return parseEnumList(post.neededPositions, POSITION_VALUES);
}

// Needed positions not yet taken by an accepted member. Each accepted member
// fills at most one slot — the one matching their PostMember.position.
export function postOpenPositions(
  post: { neededPositions?: unknown },
  members: { status: string; position: string | null }[],
): string[] {
  const open = postNeededPositions(post);
  for (const m of members) {
    if (m.status !== "ACCEPTED" || !m.position) continue;
    const i = open.indexOf(m.position);
    if (i !== -1) open.splice(i, 1);
  }
  return open;
}
