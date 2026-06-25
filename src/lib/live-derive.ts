// Live-match derived helpers: clock, win-probability curve, lineup-anchored
// player ratings synthesized from incidents, match-script tags, discipline
// risk, and goalkeeper workload.

import type { BsdEventLineups, BsdLineupPlayer, BsdTeamLineup } from "./bsd-types";
import type { LiveStatsBundle, LiveTeamStats } from "./match-stats";
import { cumXgAt, parseMomentumSeries, recentMomentum } from "./match-stats";

import {
  classifyIncident,
  incidentAssist,
  incidentMinute,
  incidentPlayer,
  incidentPlayerIn,
  incidentPlayerOut,
  incidentSide,
} from "./match-derive";
import { isFinishedMatchStatus } from "./match-status";

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace("%", "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
};
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (isObj(v)) {
    for (const k of ["results", "incidents", "items", "data"]) {
      const inner = (v as AnyObj)[k];
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
}

// ─── Clock ────────────────────────────────────────────────────────────────
/** Best-effort current minute from incidents + kickoff timestamp. */
export function computeLiveMinute(
  incidents: unknown,
  eventDate: string | null | undefined,
  status: string | null | undefined,
  currentMinute?: number | null,
): number | null {
  if (isFinishedMatchStatus(status)) return 90;
  if (typeof currentMinute === "number" && Number.isFinite(currentMinute) && currentMinute > 0) {
    return Math.max(1, Math.min(120, Math.round(currentMinute)));
  }
  const list = asArray(incidents);
  let maxIncident = 0;
  for (const r of list) {
    if (!isObj(r)) continue;
    const m = num(r.minute ?? r.time ?? r.match_minute);
    if (m !== null && m > maxIncident) maxIncident = m;
  }
  if (eventDate) {
    const elapsed = Math.floor((Date.now() - new Date(eventDate).getTime()) / 60000);
    if (elapsed >= 0) {
      const fromClock = Math.min(120, Math.max(0, elapsed));
      return Math.max(maxIncident, fromClock);
    }
  }
  return maxIncident > 0 ? maxIncident : null;
}

// ─── Score from incidents ─────────────────────────────────────────────────
export function computeLiveScore(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
): { home: number; away: number } {
  let h = 0,
    a = 0;
  for (const r of asArray(incidents)) {
    if (!isObj(r)) continue;
    const kind = classifyIncident(r);
    if (kind !== "goal" && kind !== "penalty_goal" && kind !== "own_goal") continue;
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const scoring: "home" | "away" =
      kind === "own_goal" ? (side === "home" ? "away" : "home") : side;
    if (scoring === "home") h++;
    else a++;
  }
  return { home: h, away: a };
}

// ─── Poisson residual probabilities ───────────────────────────────────────
function poiss(k: number, l: number): number {
  if (l <= 0) return k === 0 ? 1 : 0;
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.pow(l, k) * Math.exp(-l)) / f;
}

export function residualProbs(
  currentH: number,
  currentA: number,
  minute: number,
  lH: number,
  lA: number,
): { home: number; draw: number; away: number; remH: number; remA: number } {
  const rem = Math.max(0, 90 - minute) / 90;
  const remH = Math.max(0.001, lH * rem);
  const remA = Math.max(0.001, lA * rem);
  let h = 0,
    d = 0,
    a = 0;
  for (let gh = 0; gh <= 8; gh++) {
    const ph = poiss(gh, remH);
    for (let ga = 0; ga <= 8; ga++) {
      const p = ph * poiss(ga, remA);
      const fh = currentH + gh;
      const fa = currentA + ga;
      if (fh > fa) h += p;
      else if (fh < fa) a += p;
      else d += p;
    }
  }
  const s = h + d + a || 1;
  return { home: h / s, draw: d / s, away: a / s, remH, remA };
}

export type WinProbPoint = {
  minute: number;
  home: number;
  draw: number;
  away: number;
};

/** Compute multiplicative tilt factors for live λ given /stats/ momentum + xG pace.
 *  Returns { homeMul, awayMul } each ≥ 0; product < 1 dampens, > 1 amplifies. */
export function liveTiltAt(
  statistics: unknown,
  minute: number,
  lambdaHome: number,
  lambdaAway: number,
): { homeMul: number; awayMul: number; mu: number; xi: number } {
  if (minute <= 0 || !statistics) return { homeMul: 1, awayMul: 1, mu: 0, xi: 0 };
  const momentum = parseMomentumSeries(statistics);
  const { home: cumH, away: cumA } = cumXgAt(statistics, minute);
  const mRaw = recentMomentum(momentum, minute, 10); // ~ [-60..60]
  const mu = Math.max(-0.6, Math.min(0.6, mRaw / 60));
  const expectedDiff = (lambdaHome - lambdaAway) * (minute / 90);
  const xiRaw = (cumH - cumA) - expectedDiff;
  const xi = Math.max(-0.8, Math.min(0.8, xiRaw));
  const homeMul = Math.exp(0.35 * mu + 0.25 * xi);
  const awayMul = Math.exp(-0.35 * mu - 0.25 * xi);
  return { homeMul, awayMul, mu, xi };
}


export function computeWinProbCurve(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  lambdaHome: number,
  lambdaAway: number,
  currentMinute: number,
  statistics?: unknown,
): WinProbPoint[] {
  const list = asArray(incidents);
  type Goal = { minute: number; side: "home" | "away" };
  const goals: Goal[] = [];
  for (const r of list) {
    if (!isObj(r)) continue;
    const kind = classifyIncident(r);
    if (kind !== "goal" && kind !== "penalty_goal" && kind !== "own_goal") continue;
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const scoringSide: "home" | "away" =
      kind === "own_goal" ? (side === "home" ? "away" : "home") : side;
    goals.push({ minute: incidentMinute(r), side: scoringSide });
  }
  goals.sort((a, b) => a.minute - b.minute);

  const step = 3;
  const points: WinProbPoint[] = [];
  let h = 0,
    a = 0,
    gi = 0;
  const end = Math.max(currentMinute, 0);
  for (let m = 0; m <= end; m += step) {
    while (gi < goals.length && goals[gi].minute <= m) {
      if (goals[gi].side === "home") h++;
      else a++;
      gi++;
    }
    const tilt = liveTiltAt(statistics, m, lambdaHome, lambdaAway);
    const p = residualProbs(h, a, m, lambdaHome * tilt.homeMul, lambdaAway * tilt.awayMul);
    points.push({ minute: m, home: p.home, draw: p.draw, away: p.away });
  }
  if (currentMinute > 0 && (points[points.length - 1]?.minute ?? -1) < currentMinute) {
    while (gi < goals.length && goals[gi].minute <= currentMinute) {
      if (goals[gi].side === "home") h++;
      else a++;
      gi++;
    }
    const tilt = liveTiltAt(statistics, currentMinute, lambdaHome, lambdaAway);
    const p = residualProbs(
      h,
      a,
      currentMinute,
      lambdaHome * tilt.homeMul,
      lambdaAway * tilt.awayMul,
    );
    points.push({ minute: currentMinute, home: p.home, draw: p.draw, away: p.away });
  }
  return points;
}

// ─── WP swing detection ───────────────────────────────────────────────────
export type WpSwing = {
  minute: number;
  delta: number; // change in home probability
  label: string;
  team: "home" | "away" | "neutral";
};

export function computeWpSwings(
  curve: WinProbPoint[],
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  top = 3,
): WpSwing[] {
  if (curve.length < 2) return [];
  const list = asArray(incidents);
  // Build a per-minute index of curve home prob
  const minuteToHome = new Map<number, number>();
  for (const p of curve) minuteToHome.set(p.minute, p.home);
  const minutes = curve.map((p) => p.minute);

  function homeAt(minute: number): number {
    // find the curve point whose minute <= minute, closest
    let last = curve[0].home;
    for (const m of minutes) {
      if (m <= minute) last = minuteToHome.get(m) ?? last;
      else break;
    }
    return last;
  }

  const swings: WpSwing[] = [];
  for (const r of list) {
    if (!isObj(r)) continue;
    const kind = classifyIncident(r);
    if (
      kind !== "goal" &&
      kind !== "penalty_goal" &&
      kind !== "own_goal" &&
      kind !== "missed_penalty" &&
      kind !== "card_red" &&
      kind !== "card_second_yellow"
    )
      continue;
    const minute = incidentMinute(r);
    const before = homeAt(Math.max(0, minute - 1));
    const after = homeAt(Math.min(curve[curve.length - 1].minute, minute + 3));
    const delta = after - before;
    if (Math.abs(delta) < 0.02) continue;
    const side = incidentSide(r, homeTeamId, awayTeamId);
    const team: "home" | "away" | "neutral" = side;
    const player = incidentPlayer(r);
    let label = "";
    switch (kind) {
      case "goal":
        label = "Goal";
        break;
      case "penalty_goal":
        label = "Penalty scored";
        break;
      case "own_goal":
        label = "Own goal";
        break;
      case "missed_penalty":
        label = "Penalty missed";
        break;
      case "card_red":
        label = "Red card";
        break;
      case "card_second_yellow":
        label = "Second yellow";
        break;
      default:
        label = "Event";
    }
    if (player) label += ` · ${player}`;
    swings.push({ minute, delta, label, team });
  }
  return swings
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, top)
    .sort((a, b) => a.minute - b.minute);
}

// ─── Match script tags ────────────────────────────────────────────────────
export function buildMatchScriptTags(
  incidents: unknown,
  curve: WinProbPoint[],
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  liveMinute: number,
): string[] {
  const list = asArray(incidents);
  const tags: string[] = [];
  let firstGoalMinute: number | null = null;
  let yellows = 0;
  let reds = 0;
  let firstHalfGoals = 0;
  let lateSubs = 0;
  for (const r of list) {
    if (!isObj(r)) continue;
    const k = classifyIncident(r);
    const m = incidentMinute(r);
    if (k === "goal" || k === "penalty_goal" || k === "own_goal") {
      if (firstGoalMinute === null) firstGoalMinute = m;
      if (m <= 45) firstHalfGoals++;
    }
    if (k === "card_yellow" || k === "card_second_yellow") yellows++;
    if (k === "card_red" || k === "card_second_yellow") reds++;
    if (k === "substitution" && m >= 70) lateSubs++;
  }
  if (liveMinute >= 30 && firstGoalMinute === null) tags.push("Cagey opening");
  if (firstGoalMinute !== null && firstGoalMinute <= 15) tags.push("Early opener");
  if (firstHalfGoals >= 3) tags.push("Open first half");
  if (yellows >= 5) tags.push("Card storm");
  if (reds >= 1) tags.push("Red-card swing");
  if (lateSubs >= 3) tags.push("Late sub wave");
  // WP swing detection
  if (curve.length >= 2) {
    let maxAbs = 0;
    for (let i = 1; i < curve.length; i++) {
      maxAbs = Math.max(maxAbs, Math.abs(curve[i].home - curve[i - 1].home));
    }
    if (maxAbs >= 0.18) tags.push("Momentum flip");
  }
  // tight residual at late minute
  const last = curve[curve.length - 1];
  if (last && liveMinute >= 75 && last.draw >= 0.3) tags.push("Coin-flip endgame");
  // dominant
  if (last && liveMinute >= 60) {
    if (last.home >= 0.8) tags.push("Home control");
    else if (last.away >= 0.8) tags.push("Away control");
  }
  // dedupe + preserve order
  void homeTeamId;
  void awayTeamId;
  return Array.from(new Set(tags));
}

// ─── Discipline risk ──────────────────────────────────────────────────────
export type DisciplineRisk = {
  home: { yellows: number; reds: number; foulsLate: number; risk: number };
  away: { yellows: number; reds: number; foulsLate: number; risk: number };
};

export function buildDisciplineRisk(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  liveMinute: number,
): DisciplineRisk {
  const list = asArray(incidents);
  const acc = {
    home: { yellows: 0, reds: 0, foulsLate: 0, bookedLate: 0 },
    away: { yellows: 0, reds: 0, foulsLate: 0, bookedLate: 0 },
  };
  const recentWindow = 15;
  const minuteCutoff = Math.max(0, liveMinute - recentWindow);
  for (const r of list) {
    if (!isObj(r)) continue;
    const k = classifyIncident(r);
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const m = incidentMinute(r);
    if (k === "card_yellow") {
      acc[side].yellows++;
      if (m >= minuteCutoff) acc[side].bookedLate++;
    } else if (k === "card_second_yellow") {
      acc[side].yellows++;
      acc[side].reds++;
    } else if (k === "card_red") {
      acc[side].reds++;
    } else if (k === "foul" && m >= minuteCutoff) {
      acc[side].foulsLate++;
    }
  }
  const risk = (s: { yellows: number; reds: number; foulsLate: number; bookedLate: number }) =>
    Math.min(10, 0.6 * s.yellows + 0.9 * s.bookedLate + 0.15 * s.foulsLate + 2 * s.reds);
  return {
    home: { yellows: acc.home.yellows, reds: acc.home.reds, foulsLate: acc.home.foulsLate, risk: risk(acc.home) },
    away: { yellows: acc.away.yellows, reds: acc.away.reds, foulsLate: acc.away.foulsLate, risk: risk(acc.away) },
  };
}

// ─── GK workload ──────────────────────────────────────────────────────────
export type GkWorkload = {
  home: { name?: string; shotsFaced: number; saves: number; goalsConceded: number };
  away: { name?: string; shotsFaced: number; saves: number; goalsConceded: number };
};

function findGkName(team: BsdTeamLineup | null | undefined): string | undefined {
  if (!team) return undefined;
  const gk = team.players.find((p) => String(p.position).toUpperCase().startsWith("G"));
  return gk?.short_name ?? gk?.name;
}

export function buildGkWorkload(
  incidents: unknown,
  lineups: BsdEventLineups | null | undefined,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
): GkWorkload {
  const list = asArray(incidents);
  const out: GkWorkload = {
    home: { name: findGkName(lineups?.lineups?.home), shotsFaced: 0, saves: 0, goalsConceded: 0 },
    away: { name: findGkName(lineups?.lineups?.away), shotsFaced: 0, saves: 0, goalsConceded: 0 },
  };
  for (const r of list) {
    if (!isObj(r)) continue;
    const k = classifyIncident(r);
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const oppGk = side === "home" ? "away" : "home";
    if (k === "shot_on_target") {
      out[oppGk].shotsFaced++;
      out[oppGk].saves++;
    } else if (k === "goal" || k === "penalty_goal") {
      out[oppGk].shotsFaced++;
      out[oppGk].goalsConceded++;
    } else if (k === "own_goal") {
      out[side].goalsConceded++;
    }
  }
  return out;
}

// ─── Live player ratings (lineup-anchored) ────────────────────────────────
export type LiveRating = {
  player: string;
  team: "home" | "away";
  rating: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  isStarter: boolean;
  isOnPitch: boolean;
  minutesPlayed: number;
  position?: string;
  jersey?: number | null;
};

type Mutable = {
  player: string;
  team: "home" | "away";
  isStarter: boolean;
  position?: string;
  jersey?: number | null;
  enterMinute: number; // 0 for starters, sub-in minute otherwise
  exitMinute: number | null; // null = still on pitch
  // accruals
  goals: number;
  penGoals: number;
  ownGoals: number;
  assists: number;
  yellows: number;
  reds: number;
  missedPens: number;
  shotsOn: number;
  shotsOff: number;
  rawDelta: number;
};

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

function ensureFromLineup(
  map: Map<string, Mutable>,
  team: "home" | "away",
  lineup: BsdTeamLineup | null | undefined,
) {
  if (!lineup) return;
  for (const p of lineup.players) {
    const name = p.short_name ?? p.name;
    const key = `${team}:${nameKey(name)}`;
    if (!map.has(key)) {
      map.set(key, baseMutable(name, team, true, p, 0));
    }
  }
}

function baseMutable(
  name: string,
  team: "home" | "away",
  isStarter: boolean,
  p: BsdLineupPlayer | undefined,
  enterMinute: number,
): Mutable {
  return {
    player: name,
    team,
    isStarter,
    position: p ? String(p.position) : undefined,
    jersey: p?.jersey_number ?? null,
    enterMinute,
    exitMinute: null,
    goals: 0,
    penGoals: 0,
    ownGoals: 0,
    assists: 0,
    yellows: 0,
    reds: 0,
    missedPens: 0,
    shotsOn: 0,
    shotsOff: 0,
    rawDelta: 0,
  };
}

function findInSubs(
  lineup: BsdTeamLineup | null | undefined,
  name: string,
): BsdLineupPlayer | undefined {
  if (!lineup) return undefined;
  const k = nameKey(name);
  return (
    lineup.substitutes.find((p) => nameKey(p.short_name ?? p.name) === k) ??
    lineup.players.find((p) => nameKey(p.short_name ?? p.name) === k)
  );
}

export function computeLiveRatings(
  incidents: unknown,
  lineups: BsdEventLineups | null | undefined,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  liveMinute: number,
  stats?: LiveStatsBundle | null,
  providerRows?: unknown,
): LiveRating[] {

  const list = asArray(incidents);
  const map = new Map<string, Mutable>();

  const homeLineup = lineups?.lineups?.home ?? null;
  const awayLineup = lineups?.lineups?.away ?? null;
  ensureFromLineup(map, "home", homeLineup);
  ensureFromLineup(map, "away", awayLineup);
  const hasLineups = map.size > 0;

  const ensure = (
    name: string,
    team: "home" | "away",
    enterMinute = 0,
    isStarter = true,
  ): Mutable => {
    const key = `${team}:${nameKey(name)}`;
    let e = map.get(key);
    if (!e) {
      const subInfo = findInSubs(team === "home" ? homeLineup : awayLineup, name);
      e = baseMutable(name, team, isStarter, subInfo, enterMinute);
      map.set(key, e);
    }
    return e;
  };

  // Process incidents
  for (const r of list) {
    if (!isObj(r)) continue;
    const kind = classifyIncident(r);
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const team: "home" | "away" = side;
    const player = incidentPlayer(r);
    const assist = incidentAssist(r);
    const playerIn = incidentPlayerIn(r);
    const playerOut = incidentPlayerOut(r);
    const minute = incidentMinute(r);
    switch (kind) {
      case "goal":
        if (player) {
          const p = ensure(player, team);
          p.goals++;
          p.rawDelta += 1.2;
        }
        if (assist) {
          const a = ensure(assist, team);
          a.assists++;
          a.rawDelta += 0.65;
        }
        break;
      case "penalty_goal":
        if (player) {
          const p = ensure(player, team);
          p.penGoals++;
          p.goals++;
          p.rawDelta += 1.0;
        }
        if (assist) {
          const a = ensure(assist, team);
          a.assists++;
          a.rawDelta += 0.4;
        }
        break;
      case "own_goal":
        if (player) {
          const p = ensure(player, team);
          p.ownGoals++;
          p.rawDelta -= 1.8;
        }
        break;
      case "missed_penalty":
        if (player) {
          const p = ensure(player, team);
          p.missedPens++;
          p.rawDelta -= 0.5;
        }
        break;
      case "shot_on_target":
        if (player) {
          const p = ensure(player, team);
          p.shotsOn++;
          p.rawDelta += 0.1;
        }
        break;
      case "shot":
        if (player) {
          const p = ensure(player, team);
          p.shotsOff++;
          p.rawDelta += 0.04;
        }
        break;
      case "card_yellow":
        if (player) {
          const p = ensure(player, team);
          p.yellows++;
          p.rawDelta -= 0.3;
        }
        break;
      case "card_second_yellow":
        if (player) {
          const p = ensure(player, team);
          p.yellows++;
          p.reds++;
          p.rawDelta -= 1.1;
          p.exitMinute = minute;
        }
        break;
      case "card_red":
        if (player) {
          const p = ensure(player, team);
          p.reds++;
          p.rawDelta -= 1.5;
          p.exitMinute = minute;
        }
        break;
      case "substitution":
        if (playerIn) {
          const pin = ensure(playerIn, team, minute, false);
          pin.enterMinute = minute;
        }
        if (playerOut) {
          const pout = map.get(`${team}:${nameKey(playerOut)}`);
          if (pout) pout.exitMinute = minute;
          else {
            // Out-only player we didn't know about: still record so they appear
            const placeholder = ensure(playerOut, team, 0, true);
            placeholder.exitMinute = minute;
          }
        }
        break;
    }
  }

  // ─── Team-stats spread ─────────────────────────────────────────────────
  // Distribute side-level deltas across positions so starter ratings move
  // when the side dominates or struggles — even before goals happen.
  if (stats) {
    applyTeamStatsSpread(map, "home", stats.home);
    applyTeamStatsSpread(map, "away", stats.away);
  }

  // ─── Provider per-player rows override ────────────────────────────────
  // When `/events/{id}/player-stats/` returns rows, trust them: replace the
  // synthetic spread with the provider rating + counters.
  const providerByName = parseProviderRows(providerRows, homeTeamId, awayTeamId);

  // Compute minutes played + final rating per mutable
  const out: LiveRating[] = [];
  const now = Math.max(1, liveMinute || 0);
  for (const m of map.values()) {
    const onPitchUntil = m.exitMinute ?? now;
    const minutesPlayed = Math.max(0, onPitchUntil - m.enterMinute);
    const isOnPitch = m.exitMinute === null && (m.isStarter || m.enterMinute <= now);
    // Participation drift: small drift per minute played to spread starters
    const drift = 0.003 * minutesPlayed;
    let rating = Math.max(3, Math.min(10, 6.5 + m.rawDelta + drift));
    const providerKey = `${m.team}:${nameKey(m.player)}`;
    const prov = providerByName.get(providerKey);
    if (prov && typeof prov.rating === "number" && prov.rating > 0) {
      rating = prov.rating;
    }
    // When no lineups available, hide flat 6.5 rows with no signal
    if (!hasLineups && m.rawDelta === 0 && minutesPlayed === 0 && !prov) continue;
    out.push({
      player: m.player,
      team: m.team,
      rating,
      goals: (prov?.goals ?? m.goals),
      assists: (prov?.assists ?? m.assists),
      yellows: m.yellows,
      reds: m.reds,
      isStarter: m.isStarter,
      isOnPitch,
      minutesPlayed: prov?.minutes ?? minutesPlayed,
      position: m.position,
      jersey: m.jersey ?? null,
    });
  }
  return out.sort((a, b) => b.rating - a.rating);
}

function applyTeamStatsSpread(
  map: Map<string, Mutable>,
  team: "home" | "away",
  s: LiveTeamStats,
) {
  const players = [...map.values()].filter((p) => p.team === team);
  if (players.length === 0) return;
  const isPos = (p: Mutable, prefix: string) =>
    String(p.position ?? "").toUpperCase().startsWith(prefix);
  const mids = players.filter((p) => isPos(p, "M"));
  const defs = players.filter((p) => isPos(p, "D"));
  const fwds = players.filter((p) => isPos(p, "F"));
  const gks = players.filter((p) => isPos(p, "G"));

  // Pass accuracy → defenders + midfielders
  const passDelta = (s.passAccuracyPct - 80) / 100;
  for (const p of [...defs, ...mids]) {
    p.rawDelta += clamp(passDelta * 1.2, -0.2, 0.2);
  }
  // Possession → midfielders
  const possDelta = (s.ballPossession - 50) / 100;
  for (const p of mids) {
    p.rawDelta += clamp(possDelta * 0.6, -0.15, 0.15);
  }
  // GK saves → goalkeeper
  for (const p of gks) {
    p.rawDelta += 0.25 * s.goalkeeperSaves;
    if (s.goalkeeperSaves === 0 && (s.totalShots || 0) === 0) p.rawDelta += 0.05;
  }
  // Team fouls → small penalty for M + D
  const foulShare = -0.04 * (s.fouls / Math.max(1, mids.length + defs.length));
  for (const p of [...mids, ...defs]) {
    p.rawDelta += clamp(foulShare, -0.5, 0.2);
  }
  // Dangerous attacks → reward F + M
  const danger = (s.dangerousAttack - 20) / 200; // normalize
  for (const p of [...fwds, ...mids]) {
    p.rawDelta += clamp(danger, -0.15, 0.25);
  }
  // Touches in box → forwards bonus
  if (s.touchesInPenaltyArea > 10) {
    const bonus = Math.min(0.2, (s.touchesInPenaltyArea - 10) / 60);
    for (const p of fwds) p.rawDelta += bonus;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

type ProviderRow = {
  rating: number;
  goals: number;
  assists: number;
  minutes: number;
};

function parseProviderRows(
  raw: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
): Map<string, ProviderRow> {
  const out = new Map<string, ProviderRow>();
  if (!isObj(raw)) return out;
  const list = Array.isArray(raw.player_stats) ? raw.player_stats : asArray(raw);
  for (const r of list) {
    if (!isObj(r)) continue;
    const name =
      (typeof r.player_name === "string" && r.player_name) ||
      (typeof r.short_name === "string" && r.short_name) ||
      (typeof r.name === "string" && r.name) ||
      "";
    if (!name) continue;
    const teamId = num(r.team_id);
    let team: "home" | "away" | null = null;
    if (typeof r.is_home === "boolean") team = r.is_home ? "home" : "away";
    else if (teamId !== null) {
      if (homeTeamId !== undefined && teamId === homeTeamId) team = "home";
      else if (awayTeamId !== undefined && teamId === awayTeamId) team = "away";
    }
    if (!team) continue;
    out.set(`${team}:${nameKey(name)}`, {
      rating: num(r.rating) ?? 0,
      goals: num(r.goals) ?? 0,
      assists: num(r.goal_assist ?? r.assists) ?? 0,
      minutes: num(r.minutes_played) ?? 0,
    });
  }
  return out;
}



// ─── Goal-diff series (per minute) ─────────────────────────────────────────
export type GoalDiffPoint = { minute: number; diff: number };

export function buildGoalDiffSeries(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  upToMinute: number,
): GoalDiffPoint[] {
  const list = asArray(incidents);
  type G = { minute: number; side: "home" | "away" };
  const goals: G[] = [];
  for (const r of list) {
    if (!isObj(r)) continue;
    const kind = classifyIncident(r);
    if (kind !== "goal" && kind !== "penalty_goal" && kind !== "own_goal") continue;
    const side = incidentSide(r, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    const scoring: "home" | "away" =
      kind === "own_goal" ? (side === "home" ? "away" : "home") : side;
    goals.push({ minute: incidentMinute(r), side: scoring });
  }
  goals.sort((a, b) => a.minute - b.minute);
  const out: GoalDiffPoint[] = [{ minute: 0, diff: 0 }];
  const end = Math.max(90, upToMinute);
  let h = 0,
    a = 0,
    gi = 0;
  for (let m = 1; m <= end; m++) {
    while (gi < goals.length && goals[gi].minute <= m) {
      if (goals[gi].side === "home") h++;
      else a++;
      gi++;
    }
    out.push({ minute: m, diff: h - a });
  }
  return out;
}
