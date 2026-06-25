import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { bsdFetch } from "./bsd-client.server";
import type { Json } from "./bsd-types";

// ---- Types -----------------------------------------------------------------

export type CardProb = { home: number; draw: number; away: number };
export type CardPair = { home: number; away: number };

export type CardEnrichment = {
  prob?: CardProb;
  expGoals?: CardPair;       // pre-match xG forecast
  liveXg?: CardPair;
  finalXg?: CardPair;
  shots?: CardPair;
  shotsOnTarget?: CardPair;
  possession?: CardPair;     // 0..100
  momentum?: number;         // -1..1 home positive (last 15-min xG delta)
  topScorerLine?: string | null;
};

export type TeamForm = {
  team_id: number;
  rank?: number;
  played?: number;
  points?: number;
  gd?: number;
  form?: string;             // "WWDLW" newest-left or newest-right (BSD passthrough)
};

// ---- Helpers ---------------------------------------------------------------

function isObj(v: unknown): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace("%", "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function pickNum(obj: Record<string, Json> | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const n = num(obj[k]);
    if (n !== null) return n;
  }
  return null;
}

function collectCandidates(root: Json, keys: string[]): Array<Record<string, Json>> {
  const out: Array<Record<string, Json>> = [];
  if (isObj(root)) {
    out.push(root);
    for (const k of keys) {
      const v = root[k];
      if (isObj(v)) out.push(v);
    }
    // also dig one level into known envelopes
    const markets = isObj(root.markets) ? root.markets : null;
    if (markets) {
      out.push(markets);
      for (const k of keys) {
        const v = markets[k];
        if (isObj(v)) out.push(v);
      }
    }
  }
  return out;
}

function extractProbs(prediction: Json | null): CardProb | undefined {
  if (!isObj(prediction)) return undefined;
  const candidates = collectCandidates(prediction, [
    "outcome",
    "match_result",
    "result",
    "winner",
    "probabilities",
    "probs",
    "predictions",
    "one_x_two",
    "1x2",
  ]);
  for (const obj of candidates) {
    let h = pickNum(obj, ["prob_home", "prob_home_win", "home_win_prob", "home_win", "home", "1"]);
    let d = pickNum(obj, ["prob_draw", "draw_prob", "draw", "x", "X"]);
    let a = pickNum(obj, ["prob_away", "prob_away_win", "away_win_prob", "away_win", "away", "2"]);
    if (h === null && d === null && a === null) continue;
    h = h ?? 0; d = d ?? 0; a = a ?? 0;
    const total = h + d + a;
    if (total <= 0) continue;
    return total > 1.5
      ? { home: h / total, draw: d / total, away: a / total }
      : { home: h, draw: d, away: a };
  }
  return undefined;
}

function extractExpectedGoals(prediction: Json | null): CardPair | undefined {
  if (!isObj(prediction)) return undefined;
  const candidates = collectCandidates(prediction, [
    "expected_goals",
    "xg",
    "goals",
    "score",
    "predicted_goals",
  ]);
  for (const obj of candidates) {
    const h = pickNum(obj, ["home", "home_xg", "expected_home_goals", "home_expected_goals"]);
    const a = pickNum(obj, ["away", "away_xg", "expected_away_goals", "away_expected_goals"]);
    if (h !== null && a !== null && (h > 0 || a > 0)) return { home: h, away: a };
  }
  return undefined;
}


function pairFromStatsObject(statistics: Json | null): {
  xg?: CardPair;
  shots?: CardPair;
  sot?: CardPair;
  possession?: CardPair;
} {
  if (!isObj(statistics)) return {};
  // Shape A: { home: {...}, away: {...} }
  if (isObj(statistics.home) && isObj(statistics.away)) {
    const home = statistics.home;
    const away = statistics.away;
    const grab = (keys: string[]): CardPair | undefined => {
      const h = pickNum(home, keys);
      const a = pickNum(away, keys);
      return h !== null && a !== null ? { home: h, away: a } : undefined;
    };
    return {
      xg: grab(["expected_goals", "xg"]),
      shots: grab(["shots_total", "total_shots", "shots"]),
      sot: grab(["shots_on_target", "shots_on_goal"]),
      possession: grab(["possession", "ball_possession"]),
    };
  }
  // Shape B: array of {key, home, away}
  const list = Array.isArray(statistics)
    ? statistics
    : isObj(statistics.statistics) && Array.isArray(statistics.statistics)
      ? statistics.statistics
      : [];
  const acc: Record<string, CardPair> = {};
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const key = String(raw.key ?? raw.name ?? raw.type ?? "").toLowerCase();
    if (!key) continue;
    const h = num(raw.home ?? raw.home_value);
    const a = num(raw.away ?? raw.away_value);
    if (h === null || a === null) continue;
    acc[key] = { home: h, away: a };
  }
  return {
    xg: acc.expected_goals ?? acc.xg,
    shots: acc.shots_total ?? acc.total_shots ?? acc.shots,
    sot: acc.shots_on_target ?? acc.shots_on_goal,
    possession: acc.possession ?? acc.ball_possession,
  };
}

function computeMomentum(
  incidents: Json | null,
  homeTeamId: number | null | undefined,
  awayTeamId: number | null | undefined,
): number | undefined {
  if (!incidents || (!homeTeamId && !awayTeamId)) return undefined;
  const list = Array.isArray(incidents)
    ? incidents
    : isObj(incidents) && Array.isArray(incidents.incidents)
      ? (incidents.incidents as Json[])
      : isObj(incidents) && Array.isArray(incidents.results)
        ? (incidents.results as Json[])
        : [];
  if (!list.length) return undefined;
  // peak minute as "now"
  let peak = 0;
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const m = num(raw.minute ?? raw.time ?? raw.match_minute);
    if (m !== null && m > peak) peak = m;
  }
  if (peak <= 0) return undefined;
  const windowStart = Math.max(0, peak - 15);
  let h = 0;
  let a = 0;
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const m = num(raw.minute ?? raw.time ?? raw.match_minute);
    if (m === null || m < windowStart) continue;
    const xg = num(raw.xg ?? raw.expected_goals ?? raw.x_g);
    if (xg === null) continue;
    const teamId = num(raw.team_id ?? raw.team ?? raw.side_id);
    const side = (raw.side as string | undefined)?.toLowerCase();
    const isHome = side === "home" || (homeTeamId != null && teamId === homeTeamId);
    const isAway = side === "away" || (awayTeamId != null && teamId === awayTeamId);
    if (isHome) h += xg;
    else if (isAway) a += xg;
  }
  const total = h + a;
  if (total <= 0) return 0;
  return (h - a) / total; // -1..1
}

// ---- Server fn -------------------------------------------------------------

const input = z.object({
  upcomingIds: z.array(z.number()).max(16).default([]),
  liveIds: z.array(z.number()).max(16).default([]),
  recentIds: z.array(z.number()).max(16).default([]),
  leagueIds: z.array(z.number()).max(20).default([]),
  // teamId hints for incidents-based momentum
  eventTeams: z
    .array(z.object({ id: z.number(), home: z.number().optional(), away: z.number().optional() }))
    .max(48)
    .default([]),
});

export const getHomeEnrichments = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => input.parse(raw ?? {}))
  .handler(async ({ data }) => {
    const teamMap = new Map<number, { home?: number; away?: number }>();
    for (const t of data.eventTeams) teamMap.set(t.id, { home: t.home, away: t.away });

    // ---- Per-event work ---------------------------------------------------
    const upcomingJobs = data.upcomingIds.map(async (id) => {
      try {
        const pred = await bsdFetch<Json>(`/api/v2/events/${id}/prediction/`);
        const prob = extractProbs(pred);
        const expGoals = extractExpectedGoals(pred);
        return [id, { prob, expGoals }] as const;
      } catch {
        return [id, {}] as const;
      }
    });

    const liveJobs = data.liveIds.map(async (id) => {
      const teams = teamMap.get(id) ?? {};
      try {
        const [statsRes, incidentsRes] = await Promise.allSettled([
          bsdFetch<Json>(`/api/v2/events/${id}/statistics/`),
          bsdFetch<Json>(`/api/v2/events/${id}/incidents/`),
        ]);
        const stats = statsRes.status === "fulfilled" ? statsRes.value : null;
        const incidents = incidentsRes.status === "fulfilled" ? incidentsRes.value : null;
        const p = pairFromStatsObject(stats);
        const momentum = computeMomentum(incidents, teams.home ?? null, teams.away ?? null);
        const enr: CardEnrichment = {
          liveXg: p.xg,
          shots: p.shots,
          shotsOnTarget: p.sot,
          possession: p.possession,
          momentum,
        };
        return [id, enr] as const;
      } catch {
        return [id, {}] as const;
      }
    });

    const recentJobs = data.recentIds.map(async (id) => {
      try {
        const stats = await bsdFetch<Json>(`/api/v2/events/${id}/statistics/`);
        const p = pairFromStatsObject(stats);
        const enr: CardEnrichment = {
          finalXg: p.xg,
          shots: p.shots,
          shotsOnTarget: p.sot,
          possession: p.possession,
        };
        return [id, enr] as const;
      } catch {
        return [id, {}] as const;
      }
    });

    // ---- Standings (form + rank) per league ------------------------------
    type RawStanding = {
      team_id?: number;
      rank?: number;
      position?: number;
      played?: number;
      matches_played?: number;
      points?: number;
      pts?: number;
      gd?: number;
      goal_difference?: number;
      gf?: number;
      ga?: number;
      goals_for?: number;
      goals_against?: number;
      form?: string | null;
    };
    const standingsJobs = data.leagueIds.map(async (leagueId) => {
      try {
        const st = await bsdFetch<{
          standings?: RawStanding[];
          grouped?: boolean;
          groups?: Record<string, RawStanding[]>;
        }>(`/api/v2/leagues/${leagueId}/standings/`);
        // flatten grouped or use flat list
        const flat: RawStanding[] = [];
        if (Array.isArray(st.standings)) flat.push(...st.standings);
        if (st.groups && typeof st.groups === "object") {
          for (const rows of Object.values(st.groups)) {
            if (Array.isArray(rows)) flat.push(...rows);
          }
        }
        return flat.map((r, i): TeamForm => ({
          team_id: r.team_id ?? 0,
          rank: r.rank ?? r.position ?? i + 1,
          played: r.played ?? r.matches_played,
          points: r.points ?? r.pts,
          gd:
            r.gd ??
            r.goal_difference ??
            ((r.gf ?? r.goals_for ?? 0) - (r.ga ?? r.goals_against ?? 0)),
          form: r.form ?? undefined,
        }));
      } catch {
        return [] as TeamForm[];
      }
    });


    const [upcoming, live, recent, standings] = await Promise.all([
      Promise.all(upcomingJobs),
      Promise.all(liveJobs),
      Promise.all(recentJobs),
      Promise.all(standingsJobs),
    ]);

    const events: Record<string, CardEnrichment> = {};
    for (const [id, enr] of [...upcoming, ...live, ...recent]) {
      events[String(id)] = enr;
    }
    const teams: Record<string, TeamForm> = {};
    for (const rows of standings) {
      for (const r of rows) {
        if (r.team_id) teams[String(r.team_id)] = r;
      }
    }

    return { events, teams };
  });
