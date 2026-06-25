// Curated "premium" league scope for XGLabs.
//
// BSD league IDs aren't stable across deployments, so we match by name/country
// patterns against the league list returned by `listLeagues`. Each entry has:
//   - kind:      "club-domestic" | "club-continental" | "international"
//   - priority:  base weight (higher = shown first)
//   - active(now): optional function that boosts the priority while a
//                  tournament is in window (e.g. World Cup right now)
//
// To extend: add a matcher. The home page filters all BSD events to leagues
// that match one of these and ranks them by priority(now).

import type { BsdLeague } from "./bsd-types";

export type LeagueKind = "club-domestic" | "club-continental" | "international";

export interface LeagueMatcher {
  key: string;
  label: string;
  kind: LeagueKind;
  priority: number;
  /** All must match (lowercased contains) against `${country} ${name}`. */
  must: string[];
  /** If any present, league is excluded. */
  exclude?: string[];
  /** Time-window boost. */
  active?: (now: Date) => boolean;
}

// Helpers — tournament windows.
const between = (now: Date, fromIso: string, toIso: string) =>
  now >= new Date(fromIso) && now <= new Date(toIso);

export const PREMIUM_LEAGUES: LeagueMatcher[] = [
  // -------- Internationals (priority surface while active) --------
  {
    key: "fifa-world-cup",
    label: "FIFA World Cup",
    kind: "international",
    priority: 100,
    must: ["world cup"],
    exclude: ["women", "u-20", "u-17", "u20", "u17", "club world", "qualif", "beach", "futsal"],
    // 2026 men's World Cup window — broad bounds, refine when BSD confirms dates.
    active: (now) => between(now, "2026-06-08", "2026-07-20"),
  },
  {
    key: "fifa-club-world-cup",
    label: "FIFA Club World Cup",
    kind: "international",
    priority: 88,
    must: ["club world cup"],
    exclude: ["women"],
  },
  {
    key: "uefa-euro",
    label: "UEFA Euro",
    kind: "international",
    priority: 95,
    must: ["euro"],
    exclude: ["qualif", "u-21", "u-19", "u-17", "women", "league", "futsal"],
  },
  {
    key: "copa-america",
    label: "Copa América",
    kind: "international",
    priority: 90,
    must: ["copa", "américa"],
  },
  {
    key: "afcon",
    label: "Africa Cup of Nations",
    kind: "international",
    priority: 85,
    must: ["africa cup of nations"],
    exclude: ["qualif", "u-20", "u-17", "women"],
  },
  {
    key: "uefa-nations",
    label: "UEFA Nations League",
    kind: "international",
    priority: 70,
    must: ["nations league"],
  },
  {
    key: "wc-qualifiers",
    label: "World Cup Qualifiers",
    kind: "international",
    priority: 65,
    must: ["world cup", "qualif"],
    exclude: ["women", "u-20", "u-17"],
  },
  {
    key: "intl-friendlies",
    label: "International Friendlies",
    kind: "international",
    priority: 60,
    must: ["friendl"],
    exclude: ["club", "women", "u-23", "u-21", "u-20", "u-19", "u-17", "youth"],
  },


  // -------- Continental clubs --------
  {
    key: "ucl",
    label: "UEFA Champions League",
    kind: "club-continental",
    priority: 92,
    must: ["champions league"],
    exclude: ["women", "youth", "u-19", "concacaf", "afc", "caf"],
  },
  {
    key: "uel",
    label: "UEFA Europa League",
    kind: "club-continental",
    priority: 78,
    must: ["europa league"],
    exclude: ["conference"],
  },
  {
    key: "uecl",
    label: "UEFA Conference League",
    kind: "club-continental",
    priority: 68,
    must: ["conference league"],
  },
  {
    key: "libertadores",
    label: "Copa Libertadores",
    kind: "club-continental",
    priority: 75,
    must: ["libertadores"],
  },

  // -------- Domestic top-flight --------
  {
    key: "epl",
    label: "Premier League",
    kind: "club-domestic",
    priority: 90,
    must: ["england", "premier league"],
    exclude: ["women"],
  },
  {
    key: "laliga",
    label: "La Liga",
    kind: "club-domestic",
    priority: 88,
    must: ["spain", "laliga"],
  },
  {
    key: "seriea",
    label: "Serie A",
    kind: "club-domestic",
    priority: 86,
    must: ["italy", "serie a"],
    exclude: ["women"],
  },
  {
    key: "bundesliga",
    label: "Bundesliga",
    kind: "club-domestic",
    priority: 85,
    must: ["germany", "bundesliga"],
    exclude: ["2.", "women"],
  },
  {
    key: "ligue1",
    label: "Ligue 1",
    kind: "club-domestic",
    priority: 82,
    must: ["france", "ligue 1"],
  },
  {
    key: "eredivisie",
    label: "Eredivisie",
    kind: "club-domestic",
    priority: 70,
    must: ["netherlands", "eredivisie"],
  },
  {
    key: "primeira",
    label: "Primeira Liga",
    kind: "club-domestic",
    priority: 68,
    must: ["portugal", "primeira"],
  },
  {
    key: "mls",
    label: "MLS",
    kind: "club-domestic",
    priority: 64,
    must: ["mls"],
  },
  {
    key: "saudi",
    label: "Saudi Pro League",
    kind: "club-domestic",
    priority: 62,
    must: ["saudi"],
    exclude: ["1st", "second"],
  },
];

function leagueHay(l: BsdLeague): string {
  return `${l.country} ${l.name}`.toLowerCase();
}

export function matchPremiumLeague(l: BsdLeague): LeagueMatcher | null {
  if (l.is_women) return null;
  const hay = leagueHay(l);
  for (const m of PREMIUM_LEAGUES) {
    if (m.must.every((t) => hay.includes(t.toLowerCase()))) {
      if (m.exclude?.some((t) => hay.includes(t.toLowerCase()))) continue;
      return m;
    }
  }
  return null;
}

export function leaguePriority(matcher: LeagueMatcher, now: Date = new Date()): number {
  const active = matcher.active?.(now) ?? false;
  return matcher.priority + (active ? 50 : 0);
}

export interface PremiumLeague {
  id: number;
  name: string;
  country: string;
  matcher: LeagueMatcher;
  priority: number;
}

export function pickPremiumLeagues(
  all: BsdLeague[],
  now: Date = new Date(),
): PremiumLeague[] {
  const out: PremiumLeague[] = [];
  for (const l of all) {
    const m = matchPremiumLeague(l);
    if (!m) continue;
    out.push({
      id: l.id,
      name: l.name,
      country: l.country,
      matcher: m,
      priority: leaguePriority(m, now),
    });
  }
  return out.sort((a, b) => b.priority - a.priority);
}
