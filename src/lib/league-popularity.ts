// Popularity index for home-page ranking.
//
// Tier 1 — Major international tournaments (World Cup, Euro, Copa América)
// Tier 2 — Top domestic leagues + UEFA Champions/Europa/Conference + Libertadores
// Tier 3 — International friendlies, 2nd-tier UEFA national-team comps,
//          next-tier domestics, FIFA Club World Cup
// Tier 4 — everything else
//
// Reuses the curated matchers in `league-scope.ts`. Anything that isn't a
// premium league sits at tier 4 and is sorted purely by kickoff proximity.

import type { BsdEventListItem } from "./bsd-types";
import { matchPremiumLeague, type LeagueMatcher } from "./league-scope";
import { isFinishedMatchStatus, isLiveMatchStatus } from "./match-status";

export type PopRail = "live" | "upcoming" | "recent";

const TIER_BY_KEY: Record<string, number> = {
  // Tier 1
  "fifa-world-cup": 1,
  "uefa-euro": 1,
  "copa-america": 1,
  // Tier 2
  ucl: 2,
  uel: 2,
  uecl: 2,
  libertadores: 2,
  epl: 2,
  laliga: 2,
  seriea: 2,
  bundesliga: 2,
  ligue1: 2,
  // Tier 3
  "fifa-club-world-cup": 3,
  afcon: 3,
  "uefa-nations": 3,
  "wc-qualifiers": 3,
  "intl-friendlies": 3,
  eredivisie: 3,
  primeira: 3,
  mls: 3,
  saudi: 3,
};

export function popularityTier(leagueName?: string, country?: string): number {
  if (!leagueName) return 4;
  const m: LeagueMatcher | null = matchPremiumLeague({
    id: 0,
    name: leagueName,
    country: country ?? "",
    is_women: false,
    is_active: true,
    current_season: null,
  });
  if (!m) return 4;
  return TIER_BY_KEY[m.key] ?? 4;
}

export interface ScorableEvent extends Partial<BsdEventListItem> {
  id: number;
  league_id: number;
  event_date: string;
  status: string;
  league_name?: string;
  league_country?: string;
}

/**
 * Higher = more important. Tier dominates; time breaks ties:
 *   - live: higher minute first (more advanced match = more drama),
 *           but all live > any non-live within tier
 *   - upcoming: sooner kickoff first
 *   - recent: more recently finished first
 */
export function popularityScore(
  ev: ScorableEvent,
  now: Date = new Date(),
  rail?: PopRail,
): number {
  const tier = popularityTier(ev.league_name, ev.league_country);
  const tierBonus = (5 - tier) * 1_000_000_000;

  const kickoff = new Date(ev.event_date).getTime();
  const delta = kickoff - now.getTime(); // ms
  const detected: PopRail =
    rail ??
    (isLiveMatchStatus(ev.status)
      ? "live"
      : isFinishedMatchStatus(ev.status) || delta < 0
        ? "recent"
        : "upcoming");

  let timeBonus = 0;
  if (detected === "live") {
    // any live match outranks non-live within its tier
    timeBonus = 500_000_000 + (ev.current_minute ?? 0) * 1000;
  } else if (detected === "upcoming") {
    // sooner = higher; clamp to 7 days
    const mins = Math.max(0, Math.min(7 * 24 * 60, delta / 60_000));
    timeBonus = -mins;
  } else {
    // more recent finish = higher
    const mins = Math.max(0, Math.min(7 * 24 * 60, -delta / 60_000));
    timeBonus = -mins;
  }

  return tierBonus + timeBonus;
}

export function sortByPopularity<T extends ScorableEvent>(
  events: T[],
  rail?: PopRail,
  now: Date = new Date(),
): T[] {
  return events
    .slice()
    .sort((a, b) => popularityScore(b, now, rail) - popularityScore(a, now, rail));
}
