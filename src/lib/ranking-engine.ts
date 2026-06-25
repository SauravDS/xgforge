// Blended ranking engine.
// Inputs per player:
//   1. BSD `ai_score` (0..1)            — opaque AI signal
//   2. Recent-form points (per-90 × xMin) — last 5 matches with minutes>0
//   3. Season-average points              — last ~20 matches
//   4. Team-context points                — clean sheet / attack upside
// Output: a single blended projection plus a per-source breakdown that the
// UI can display, so picks remain explainable.

import type {
  BsdEventLineups,
  BsdLineupPlayer,
  BsdPosition,
  Json,
} from "./bsd-types";
import type { PlayerFormMap, StandingsMap } from "./bsd.functions";
import {
  momentumFromStandingsRow,
  summarizeForm,
  teamContextPoints,
  type PlayerStatRow,
  type PosKey,
} from "./scoring";

export interface ProjectionBreakdown {
  form: number;
  season: number;
  team: number;
  ai: number;
}

export interface RankedPlayer {
  id: number;
  name: string;
  short_name: string | null;
  position: BsdPosition | string;
  jersey_number: number | null;
  team_id: number;
  team_name: string;
  team_side: "home" | "away";
  is_starter: boolean;
  ai_score: number;
  team_strength: number;
  projection: number;
  breakdown: ProjectionBreakdown;
  form_matches: number;
  expected_minutes: number;
  rating: number;
  rank: number;
}

export interface MatchRanking {
  status: "ok" | "no_lineup";
  message?: string;
  top11: RankedPlayer[];
  alternates: RankedPlayer[];
  captain: RankedPlayer | null;
  viceCaptain: RankedPlayer | null;
  context: {
    home_team: string;
    away_team: string;
    home_strength: number;
    away_strength: number;
    favored: "home" | "away" | "even";
  };
}

const POSITION_WEIGHT: Record<PosKey, number> = {
  G: 1.0,
  D: 1.05,
  M: 1.15,
  F: 1.2,
};

// Blend weights — sum to 1.0.
const W_FORM = 0.45;
const W_SEASON = 0.25;
const W_TEAM = 0.15;
const W_AI = 0.15;

// Scale ai_score (0..1) into the same "fantasy points" ballpark as the others
// so the weighted average makes sense. 0..1 → 0..40 pts.
const AI_TO_POINTS = 40;

function normPos(p: string): PosKey {
  const c = (p ?? "").toUpperCase();
  if (c.startsWith("G")) return "G";
  if (c.startsWith("D")) return "D";
  if (c.startsWith("M")) return "M";
  if (c.startsWith("F") || c.startsWith("A")) return "F";
  return "M";
}

function safeNum(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function extractStrength(prediction: Json | null): { home: number; away: number } {
  let pHome = 0.4;
  let pAway = 0.4;
  if (prediction && typeof prediction === "object" && !Array.isArray(prediction)) {
    const obj = prediction as Record<string, Json>;
    const dig = (k: string) =>
      obj[k] ??
      (obj.outcome && typeof obj.outcome === "object" && !Array.isArray(obj.outcome)
        ? (obj.outcome as Record<string, Json>)[k]
        : undefined);
    const ph = dig("prob_home_win") ?? dig("home_win_prob");
    const pa = dig("prob_away_win") ?? dig("away_win_prob");
    if (typeof ph === "number") pHome = ph;
    if (typeof pa === "number") pAway = pa;
  }
  const total = pHome + pAway;
  if (total > 0) return { home: pHome / total, away: pAway / total };
  return { home: 0.5, away: 0.5 };
}

export function buildMatchRanking(
  lineups: BsdEventLineups | null,
  prediction: Json | null,
  playerForm: PlayerFormMap,
  standings: StandingsMap,
  fallback: { home_team: string; away_team: string },
): MatchRanking {
  const ok =
    !!lineups?.lineups?.home?.players?.length &&
    !!lineups?.lineups?.away?.players?.length;

  const { home: hStr, away: aStr } = extractStrength(prediction);
  const context = {
    home_team: lineups?.lineups?.home?.team_name ?? fallback.home_team,
    away_team: lineups?.lineups?.away?.team_name ?? fallback.away_team,
    home_strength: hStr,
    away_strength: aStr,
    favored:
      Math.abs(hStr - aStr) < 0.04
        ? ("even" as const)
        : hStr > aStr
          ? ("home" as const)
          : ("away" as const),
  };

  if (!ok) {
    return {
      status: "no_lineup",
      message:
        lineups?.lineup_status === "unavailable"
          ? "Lineup not yet published. Check back closer to kickoff."
          : "Lineup data unavailable for this match.",
      top11: [],
      alternates: [],
      captain: null,
      viceCaptain: null,
      context,
    };
  }

  const home = lineups!.lineups!.home!;
  const away = lineups!.lineups!.away!;

  const homeMomentum = momentumFromStandingsRow(
    standings[String(home.team_id)] ?? null,
    home.team_id,
  );
  const awayMomentum = momentumFromStandingsRow(
    standings[String(away.team_id)] ?? null,
    away.team_id,
  );

  const everyone: RankedPlayer[] = [];
  for (const side of ["home", "away"] as const) {
    const team = side === "home" ? home : away;
    const ownMomentum = side === "home" ? homeMomentum : awayMomentum;
    const oppMomentum = side === "home" ? awayMomentum : homeMomentum;
    const strength = side === "home" ? hStr : aStr;

    for (const p of team.players) {
      everyone.push(
        rankOne(p, team, side, true, strength, ownMomentum, oppMomentum, playerForm),
      );
    }
    for (const p of team.substitutes) {
      everyone.push(
        rankOne(p, team, side, false, strength, ownMomentum, oppMomentum, playerForm),
      );
    }
  }

  everyone.sort((a, b) => b.projection - a.projection);
  everyone.forEach((r, i) => (r.rank = i + 1));

  const top11 = everyone.slice(0, 11);
  const alternates = everyone.slice(11);

  return {
    status: "ok",
    top11,
    alternates,
    captain: top11[0] ?? null,
    viceCaptain: top11[1] ?? null,
    context,
  };
}

function rankOne(
  p: BsdLineupPlayer,
  team: { team_id: number; team_name: string },
  side: "home" | "away",
  isStarter: boolean,
  teamStrength: number,
  ownMomentum: ReturnType<typeof momentumFromStandingsRow>,
  oppMomentum: ReturnType<typeof momentumFromStandingsRow>,
  playerForm: PlayerFormMap,
): RankedPlayer {
  const pos = normPos(String(p.position));
  const rows = (playerForm[String(p.id)] ?? []) as PlayerStatRow[];

  // Form window: last 5 rows that include minutes.
  const recent = rows
    .filter((r) => typeof r.minutes_played === "number")
    .slice(0, 5);
  const form = summarizeForm(recent, pos);
  const season = summarizeForm(rows, pos);

  const aiScore = safeNum(p.ai_score, 0);

  const breakdown: ProjectionBreakdown = {
    form: form.projectedPoints,
    season: season.projectedPoints,
    team: teamContextPoints(pos, ownMomentum, oppMomentum),
    ai: aiScore * AI_TO_POINTS,
  };

  // If the player has zero form data, lean entirely on AI + team context so
  // unknown players still rank reasonably.
  const hasForm = form.matches > 0;
  const wForm = hasForm ? W_FORM : 0;
  const wSeason = hasForm ? W_SEASON : 0;
  const wAi = hasForm ? W_AI : W_AI + W_FORM + W_SEASON; // absorb missing weight
  const blended =
    wForm * breakdown.form +
    wSeason * breakdown.season +
    W_TEAM * breakdown.team +
    wAi * breakdown.ai;

  const posW = POSITION_WEIGHT[pos];
  const teamMul = 0.9 + teamStrength * 0.4; // [0.9 .. 1.3]
  const starterBonus = isStarter ? 1.0 : 0.55;

  const projection = Math.round(blended * posW * teamMul * starterBonus * 10) / 10;

  return {
    id: p.id,
    name: p.name,
    short_name: p.short_name,
    position: pos,
    jersey_number: p.jersey_number,
    team_id: team.team_id,
    team_name: team.team_name,
    team_side: side,
    is_starter: isStarter,
    ai_score: aiScore,
    team_strength: teamStrength,
    projection,
    breakdown,
    form_matches: form.matches,
    expected_minutes: form.expectedMinutes || (isStarter ? 80 : 20),
    rating: form.rating,
    rank: 0,
  };
}
