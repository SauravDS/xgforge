// Simplified Dream11-style football scoring vector.
// Converts a row of raw per-match stats into a fantasy point total, then a
// per-90 rate. Kept in one place so weights are easy to tune later.

export type PlayerStatRow = {
  minutes_played: number | null;
  rating: number | null;
  goals: number | null;
  goal_assist: number | null;
  expected_goals: number | null;
  expected_assists: number | null;
  total_shots: number | null;
  shots_on_target: number | null;
  key_pass: number | null;
  total_tackle: number | null;
  won_tackle: number | null;
  interception: number | null;
  saves: number | null;
  goals_conceded: number | null;
  yellow_card: number | null;
  red_card: number | null;
};

export type PosKey = "G" | "D" | "M" | "F";

const GOAL_POINTS: Record<PosKey, number> = { G: 10, D: 10, M: 8, F: 5 };
const CLEAN_SHEET_POINTS: Record<PosKey, number> = { G: 10, D: 10, M: 5, F: 0 };
const CONCEDE_PENALTY_PER_2: Record<PosKey, number> = { G: 2, D: 2, M: 0, F: 0 };

const n = (x: number | null | undefined): number =>
  typeof x === "number" && Number.isFinite(x) ? x : 0;

/** Convert one match row to Dream11-style fantasy points for a given position. */
export function fantasyPointsForMatch(row: PlayerStatRow, pos: PosKey): number {
  const mins = n(row.minutes_played);
  if (mins <= 0) return 0;

  let pts = 0;
  // Starting / playing time
  pts += mins >= 60 ? 4 : mins >= 1 ? 2 : 0;
  // Scoring contributions
  pts += n(row.goals) * GOAL_POINTS[pos];
  pts += n(row.goal_assist) * 6;
  pts += n(row.shots_on_target) * 1;
  pts += n(row.key_pass) * 1;
  // Defensive contributions
  pts += n(row.won_tackle) * 1;
  pts += n(row.interception) * 1;
  // GK
  pts += n(row.saves) * 0.5;
  // Clean sheet / conceded (only if player actually played ~full match)
  if (mins >= 60) {
    if (n(row.goals_conceded) === 0) pts += CLEAN_SHEET_POINTS[pos];
    const concedePen = CONCEDE_PENALTY_PER_2[pos];
    if (concedePen > 0) pts -= Math.floor(n(row.goals_conceded) / 2) * concedePen;
  }
  // Cards
  pts -= n(row.yellow_card) * 1;
  pts -= n(row.red_card) * 3;
  return pts;
}

export interface FormSummary {
  matches: number;        // matches in the window with minutes>0
  avgMinutes: number;     // average minutes per match (window)
  expectedMinutes: number;// projected minutes for next match
  per90Points: number;    // average fantasy points per 90 mins
  projectedPoints: number;// per90 × expectedMinutes/90
  rating: number;         // average BSD match rating in window
}

const EMPTY: FormSummary = {
  matches: 0,
  avgMinutes: 0,
  expectedMinutes: 0,
  per90Points: 0,
  projectedPoints: 0,
  rating: 0,
};

/** Aggregate a list of match rows into a per-90 fantasy projection. */
export function summarizeForm(
  rows: PlayerStatRow[] | null | undefined,
  pos: PosKey,
): FormSummary {
  if (!rows || rows.length === 0) return EMPTY;
  const played = rows.filter((r) => n(r.minutes_played) > 0);
  if (played.length === 0) return EMPTY;

  let totalPts = 0;
  let totalMins = 0;
  let ratingSum = 0;
  let ratingN = 0;
  for (const r of played) {
    totalPts += fantasyPointsForMatch(r, pos);
    totalMins += n(r.minutes_played);
    if (typeof r.rating === "number") {
      ratingSum += r.rating;
      ratingN += 1;
    }
  }
  const per90 = totalMins > 0 ? (totalPts / totalMins) * 90 : 0;
  const avgMinutes = totalMins / played.length;
  // Expected minutes: regress toward 90 for high-minute players, toward avg
  // for rotation players. Capped at 90.
  const expectedMinutes = Math.min(90, Math.round(avgMinutes * 0.85 + 90 * 0.15));
  return {
    matches: played.length,
    avgMinutes,
    expectedMinutes,
    per90Points: per90,
    projectedPoints: (per90 * expectedMinutes) / 90,
    rating: ratingN > 0 ? ratingSum / ratingN : 0,
  };
}

export interface TeamMomentum {
  team_id: number;
  form_string: string;       // e.g. "WDWLW" from /standings/
  form_pts_per_game: number; // 0..3
  gf_per_game: number;
  ga_per_game: number;
  xgf_per_game: number;
  xga_per_game: number;
}

const NULL_MOMENTUM = (team_id: number): TeamMomentum => ({
  team_id,
  form_string: "",
  form_pts_per_game: 1.0,
  gf_per_game: 1.0,
  ga_per_game: 1.0,
  xgf_per_game: 1.0,
  xga_per_game: 1.0,
});

export function momentumFromStandingsRow(
  row: Record<string, unknown> | null,
  team_id: number,
): TeamMomentum {
  if (!row) return NULL_MOMENTUM(team_id);
  const played = Number(row.played) || 0;
  const form = String(row.form ?? "");
  const formPts = form
    .split("")
    .reduce((acc, c) => acc + (c === "W" ? 3 : c === "D" ? 1 : 0), 0);
  const formGames = form.length || 1;
  return {
    team_id,
    form_string: form,
    form_pts_per_game: formPts / formGames,
    gf_per_game: played > 0 ? Number(row.gf || 0) / played : 1,
    ga_per_game: played > 0 ? Number(row.ga || 0) / played : 1,
    xgf_per_game:
      played > 0 ? Number(row.xgf || row.gf || 0) / played : 1,
    xga_per_game:
      played > 0 ? Number(row.xga || row.ga || 0) / played : 1,
  };
}

/**
 * Team-context points for a player. Bigger for defenders/keepers facing weak
 * attacks (clean sheet upside), and for forwards/mids facing leaky defenses.
 */
export function teamContextPoints(
  pos: PosKey,
  ownMomentum: TeamMomentum,
  oppMomentum: TeamMomentum,
): number {
  // Probability-ish that own team keeps a clean sheet given opp attack & own def.
  const oppAttack = oppMomentum.xgf_per_game; // higher = harder clean sheet
  const ownDef = ownMomentum.xga_per_game;    // lower own xga = better defense
  const cleanSheetPressure = Math.max(0.2, Math.min(2.0, (oppAttack + ownDef) / 2));
  // Goal upside for attackers
  const oppDefWeak = oppMomentum.xga_per_game; // higher = easier to score
  const ownAttack = ownMomentum.xgf_per_game;
  const attackBoost = (oppDefWeak + ownAttack) / 2;

  if (pos === "G" || pos === "D") {
    // Map low pressure (~0.6) to +5 pts, high pressure (~2.0) to -1 pts.
    return Math.round((6 - cleanSheetPressure * 3) * 10) / 10;
  }
  if (pos === "M") {
    return Math.round(((4 - cleanSheetPressure) + attackBoost) * 5) / 10;
  }
  // Forward
  return Math.round(attackBoost * 2.5 * 10) / 10;
}
