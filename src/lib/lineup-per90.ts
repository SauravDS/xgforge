// Aggregate per-90 stats for a set of lineup players from their recent form.
// Lineup-driven (not RankedPlayer-driven) so the same helper works for
// TacticalEdges, KeyDuels, SetPieceThreat and DisciplineRow.

import type { BsdLineupPlayer } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";

export type PlayerPer90 = {
  id: number;
  name: string;
  short_name: string | null;
  position: string;
  jersey_number: number | null;
  matches: number;
  minutes: number;
  xg90: number;
  xa90: number;
  shots90: number;
  keyPasses90: number;
  tackles90: number;
  interceptions90: number;
  saves90: number;
  goals90: number;
  assists90: number;
  yellow90: number;
  red90: number;
  // Cross delivery & duels
  crosses90: number;
  crossesAcc90: number;
  crossAccuracy: number; // 0..1
  aerialWon90: number;
  aerialLost90: number;
  aerialWinRate: number; // 0..1
  contests90: number; // dribble attempts
  contestsWon90: number;
  contestWinRate: number; // 0..1
  fouled90: number;
  rating: number;
};

const num = (v: unknown): number =>
  typeof v === "number" && Number.isFinite(v) ? v : 0;

export function computePlayerPer90(
  player: BsdLineupPlayer,
  form: PlayerFormMap,
): PlayerPer90 {
  const rows = form[String(player.id)] ?? [];
  let minutes = 0;
  let matches = 0;
  let xg = 0;
  let xa = 0;
  let shots = 0;
  let kp = 0;
  let tk = 0;
  let intc = 0;
  let saves = 0;
  let goals = 0;
  let assists = 0;
  let yellow = 0;
  let red = 0;
  let cross = 0;
  let crossAcc = 0;
  let aerWon = 0;
  let aerLost = 0;
  let contest = 0;
  let contestWon = 0;
  let fouled = 0;
  let ratingSum = 0;
  let ratingN = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, number | null | undefined>;
    const m = num(r.minutes_played);
    if (m <= 0) continue;
    matches++;
    minutes += m;
    xg += num(r.expected_goals);
    xa += num(r.expected_assists);
    shots += num(r.total_shots);
    kp += num(r.key_pass);
    tk += num(r.total_tackle);
    intc += num(r.interception);
    saves += num(r.saves);
    goals += num(r.goals);
    assists += num(r.goal_assist);
    yellow += num(r.yellow_card);
    red += num(r.red_card);
    cross += num(r.total_cross);
    crossAcc += num(r.accurate_cross);
    aerWon += num(r.aerial_won);
    aerLost += num(r.aerial_lost);
    contest += num(r.total_contest);
    contestWon += num(r.won_contest);
    fouled += num(r.was_fouled);
    const rt = num(r.rating);
    if (rt > 0) {
      ratingSum += rt;
      ratingN++;
    }
  }
  const per90 = (v: number) => (minutes > 0 ? (v / minutes) * 90 : 0);
  const rate = (n: number, d: number) => (d > 0 ? n / d : 0);
  return {
    id: player.id,
    name: player.name,
    short_name: player.short_name,
    position: String(player.position),
    jersey_number: player.jersey_number,
    matches,
    minutes,
    xg90: per90(xg),
    xa90: per90(xa),
    shots90: per90(shots),
    keyPasses90: per90(kp),
    tackles90: per90(tk),
    interceptions90: per90(intc),
    saves90: per90(saves),
    goals90: per90(goals),
    assists90: per90(assists),
    yellow90: per90(yellow),
    red90: per90(red),
    crosses90: per90(cross),
    crossesAcc90: per90(crossAcc),
    crossAccuracy: rate(crossAcc, cross),
    aerialWon90: per90(aerWon),
    aerialLost90: per90(aerLost),
    aerialWinRate: rate(aerWon, aerWon + aerLost),
    contests90: per90(contest),
    contestsWon90: per90(contestWon),
    contestWinRate: rate(contestWon, contest),
    fouled90: per90(fouled),
    rating: ratingN ? ratingSum / ratingN : 0,
  };
}

export function computeSidePer90(
  players: BsdLineupPlayer[],
  form: PlayerFormMap,
): PlayerPer90[] {
  return players.map((p) => computePlayerPer90(p, form));
}

export type SideTotals = {
  matches: number;
  minutes: number;
  xg: number;
  xa: number;
  shots: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  saves: number;
  yellow: number;
  red: number;
  rating: number;
};

export function sumSideRaw(
  players: BsdLineupPlayer[],
  form: PlayerFormMap,
): SideTotals {
  const t: SideTotals = {
    matches: 0,
    minutes: 0,
    xg: 0,
    xa: 0,
    shots: 0,
    keyPasses: 0,
    tackles: 0,
    interceptions: 0,
    saves: 0,
    yellow: 0,
    red: 0,
    rating: 0,
  };
  let ratingN = 0;
  for (const p of players) {
    const rows = form[String(p.id)] ?? [];
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, number | null | undefined>;
      const m = num(r.minutes_played);
      if (m <= 0) continue;
      t.matches++;
      t.minutes += m;
      t.xg += num(r.expected_goals);
      t.xa += num(r.expected_assists);
      t.shots += num(r.total_shots);
      t.keyPasses += num(r.key_pass);
      t.tackles += num(r.total_tackle);
      t.interceptions += num(r.interception);
      t.saves += num(r.saves);
      t.yellow += num(r.yellow_card);
      t.red += num(r.red_card);
      const rt = num(r.rating);
      if (rt > 0) {
        t.rating += rt;
        ratingN++;
      }
    }
  }
  t.rating = ratingN ? t.rating / ratingN : 0;
  return t;
}
