// Resolve which set of players powers the "Tactical edge" section.
// Confirmed lineup wins; otherwise predicted; otherwise null (UI shows
// an "awaiting lineup" empty state).

import type { BsdEventLineups, BsdLineupPlayer } from "@/lib/bsd-types";

export type TacticalSource = "confirmed" | "predicted" | null;

export type TacticalXI = {
  source: TacticalSource;
  home: BsdLineupPlayer[];
  away: BsdLineupPlayer[];
  homeFormation: string | null;
  awayFormation: string | null;
  confidence: number | null;
};

export function selectTacticalXI(lineups: BsdEventLineups | null): TacticalXI {
  const status = lineups?.lineup_status;
  if (status !== "confirmed" && status !== "predicted") {
    return {
      source: null,
      home: [],
      away: [],
      homeFormation: null,
      awayFormation: null,
      confidence: null,
    };
  }
  const home = lineups?.lineups?.home?.players ?? [];
  const away = lineups?.lineups?.away?.players ?? [];
  if (!home.length || !away.length) {
    return {
      source: null,
      home: [],
      away: [],
      homeFormation: null,
      awayFormation: null,
      confidence: null,
    };
  }
  // Confidence: use the lower of the two sides if both supplied (BSD gives
  // it per side; the "weaker" side is the meaningful lower bound).
  const cH = lineups?.lineups?.home?.confidence ?? null;
  const cA = lineups?.lineups?.away?.confidence ?? null;
  let confidence: number | null = null;
  if (cH !== null && cA !== null) confidence = Math.min(cH, cA);
  else if (cH !== null) confidence = cH;
  else if (cA !== null) confidence = cA;

  return {
    source: status,
    home,
    away,
    homeFormation: lineups?.lineups?.home?.formation ?? null,
    awayFormation: lineups?.lineups?.away?.formation ?? null,
    confidence,
  };
}
