// Parse a formation string ("4-3-3", "3-4-2-1", "4-2-3-1") into row buckets,
// then map each starter (in BSD order) to a pitch coordinate.
// Coordinate system: pitch is 100 wide × 64 tall. Home defends LEFT half
// (x = 0 → 0.5), away defends RIGHT half. GK sits closest to own goal.

export type PitchCoord = { x: number; y: number };

export function parseFormation(raw: string | null | undefined): number[] {
  // Strip non-numeric except dashes, then split. "4-3-3" → [4,3,3]
  if (!raw) return [4, 4, 2]; // safe default if formation missing
  const parts = String(raw)
    .replace(/[^\d\-]/g, "")
    .split("-")
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0);
  const total = parts.reduce((a, b) => a + b, 0);
  if (total === 10) return parts; // outfield only, 10 players
  // Some sources include GK — drop the leading 1 if so.
  if (total === 11 && parts[0] === 1) return parts.slice(1);
  if (total === 11) return parts; // total of 11 with GK as last? assume outfield
  return parts.length ? parts : [4, 4, 2];
}

/**
 * Build per-starter coordinates for a side. Returns coords in pitch units
 * (0..100 × 0..64). The order matches the formation rows: GK first, then
 * defenders, mids, forwards. Caller passes its own player array in the
 * SAME order as BSD returns them (BSD orders by formation row already in
 * the `players` array, GK first).
 *
 * Home side occupies x in [4..46]; away occupies [54..96] (mirrored).
 */
export function buildSlotCoords(
  formation: number[],
  side: "home" | "away",
): PitchCoord[] {
  const out: PitchCoord[] = [];
  // GK always first slot — placed near own goal.
  const gkX = side === "home" ? 4 : 96;
  out.push({ x: gkX, y: 32 });

  // Outfield rows distributed across [13..46] (home) / [54..87] (away).
  const start = side === "home" ? 13 : 54;
  const end = side === "home" ? 46 : 87;
  const rows = formation.length;
  for (let r = 0; r < rows; r++) {
    const t = rows === 1 ? 0.5 : r / (rows - 1);
    // For home, x grows away from own goal (left → centre).
    // For away, x decreases (right → centre).
    const x = side === "home" ? start + t * (end - start) : end - t * (end - start);
    const n = formation[r];
    for (let i = 0; i < n; i++) {
      // Stagger rows slightly so adjacent rows don't sit on the same y.
      const baseY = ((i + 1) / (n + 1)) * 64;
      const wobble = r % 2 === 0 ? 0 : 1.5; // alternating row offset, subtle
      out.push({ x, y: baseY + wobble - 0.75 });
    }
  }
  return out;
}

/** Best-effort coordinate per starter index (0..10). Falls back to a 4-4-2
 *  layout if the supplied formation has the wrong total. */
export function coordsForStarters(
  formation: number[],
  count: number,
  side: "home" | "away",
): PitchCoord[] {
  const coords = buildSlotCoords(formation, side);
  if (coords.length >= count) return coords.slice(0, count);
  // Pad with a fallback 4-4-2 if formation underflows
  const fallback = buildSlotCoords([4, 4, 2], side);
  while (coords.length < count) coords.push(fallback[coords.length] ?? { x: 50, y: 32 });
  return coords;
}

/**
 * Derive a one-line tactical read by comparing the two formation shapes.
 * Inputs are outfield-row arrays (e.g. [4,3,3]).
 */
export function tacticalRead(homeF: number[], awayF: number[], homeName: string, awayName: string): string {
  // Number of midfield rows = formation.length - 2 (excl. defenders & forwards)
  const homeMids = sumMids(homeF);
  const awayMids = sumMids(awayF);
  const homeDef = homeF[0] ?? 4;
  const awayDef = awayF[0] ?? 4;
  const homeFwd = homeF[homeF.length - 1] ?? 2;
  const awayFwd = awayF[awayF.length - 1] ?? 2;

  if (homeMids - awayMids >= 2) return `${homeName} stacks the midfield — ${homeMids}v${awayMids} central overload.`;
  if (awayMids - homeMids >= 2) return `${awayName} stacks the midfield — ${awayMids}v${homeMids} central overload.`;
  if (homeFwd - awayFwd >= 1 && homeF[0] <= 3) return `${homeName} commits to front-foot pressure with ${homeFwd} forwards on a ${homeDef}-back line.`;
  if (awayFwd - homeFwd >= 1 && awayF[0] <= 3) return `${awayName} commits to front-foot pressure with ${awayFwd} forwards on a ${awayDef}-back line.`;
  if (homeDef > awayDef) return `${homeName} sits deeper on a ${homeDef}-back; expect width vs. ${awayName}'s ${awayDef}-man rear.`;
  if (awayDef > homeDef) return `${awayName} drops into a ${awayDef}-back block away from home.`;
  return `Symmetric ${homeF.join("-")} vs ${awayF.join("-")} — battle decided in transitions.`;
}

function sumMids(formation: number[]): number {
  if (formation.length <= 2) return 0;
  let s = 0;
  for (let i = 1; i < formation.length - 1; i++) s += formation[i];
  return s;
}
