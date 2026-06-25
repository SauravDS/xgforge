// Parser for BSD's /events/{id}/stats/ payload.
// Shape: { event_id, stats: { home: {...}, away: {...}, first_half?: {home,away}, second_half?: {home,away} } }

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

export type RatioStat = { value: number; total: number; pct: number };

export type LiveTeamStats = {
  totalShots: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  shotsInsideBox: number;
  shotsOutsideBox: number;
  blockedShots: number;
  hitWoodwork: number;
  passes: number;
  accuratePasses: number;
  passAccuracyPct: number;
  ballPossession: number;
  expectedGoals: number;
  xgActual: number | null;
  fouls: number;
  yellowCards: number;
  redCards: number;
  cornerKicks: number;
  freeKicks: number;
  throwIns: number;
  goalKicks: number;
  offsides: number;
  goalkeeperSaves: number;
  totalSaves: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
  clearances: number;
  dangerousAttack: number;
  attack: number;
  ballSafe: number;
  attackPct: number;
  dangerousAttackPct: number;
  ballSafePct: number;
  touchesInPenaltyArea: number;
  finalThirdEntries: number;
  crosses: RatioStat;
  dribbles: RatioStat;
  aerialDuels: RatioStat;
  longBalls: RatioStat;
  groundDuels: RatioStat;
  recoveries: number;
  duels: number;
};

export type LiveStatsBundle = {
  home: LiveTeamStats;
  away: LiveTeamStats;
  periods: {
    firstHalf?: { home: LiveTeamStats; away: LiveTeamStats };
    secondHalf?: { home: LiveTeamStats; away: LiveTeamStats };
  };
};

const emptyRatio: RatioStat = { value: 0, total: 0, pct: 0 };

function readRatio(v: unknown): RatioStat {
  if (!isObj(v)) {
    const n = num(v);
    return n !== null ? { value: n, total: n, pct: 100 } : emptyRatio;
  }
  return {
    value: num(v.value) ?? 0,
    total: num(v.total) ?? 0,
    pct: num(v.pct) ?? 0,
  };
}

function readSide(raw: unknown): LiveTeamStats {
  const o = isObj(raw) ? raw : {};
  const xgObj = isObj(o.xg) ? (o.xg as AnyObj) : {};
  return {
    totalShots: num(o.total_shots) ?? 0,
    shotsOnTarget: num(o.shots_on_target) ?? 0,
    shotsOffTarget: num(o.shots_off_target) ?? 0,
    shotsInsideBox: num(o.shots_inside_box) ?? 0,
    shotsOutsideBox: num(o.shots_outside_box) ?? 0,
    blockedShots: num(o.blocked_shots) ?? 0,
    hitWoodwork: num(o.hit_woodwork) ?? 0,
    passes: num(o.passes) ?? 0,
    accuratePasses: num(o.accurate_passes) ?? 0,
    passAccuracyPct: num(o.pass_accuracy_pct) ?? 0,
    ballPossession: num(o.ball_possession) ?? 0,
    expectedGoals: num(o.expected_goals) ?? 0,
    xgActual: num(xgObj.actual),
    fouls: num(o.fouls) ?? 0,
    yellowCards: num(o.yellow_cards) ?? 0,
    redCards: num(o.red_cards) ?? 0,
    cornerKicks: num(o.corner_kicks) ?? 0,
    freeKicks: num(o.free_kicks) ?? 0,
    throwIns: num(o.throw_ins) ?? 0,
    goalKicks: num(o.goal_kicks) ?? 0,
    offsides: num(o.offsides) ?? 0,
    goalkeeperSaves: num(o.goalkeeper_saves) ?? 0,
    totalSaves: num(o.total_saves) ?? 0,
    tackles: num(o.tackles) ?? 0,
    tacklesWon: num(o.tackles_won) ?? 0,
    interceptions: num(o.interceptions) ?? 0,
    clearances: num(o.clearances) ?? 0,
    dangerousAttack: num(o.dangerous_attack) ?? 0,
    attack: num(o.attack) ?? 0,
    ballSafe: num(o.ball_safe) ?? 0,
    attackPct: num(o.attack_pct) ?? 0,
    dangerousAttackPct: num(o.dangerous_attack_pct) ?? 0,
    ballSafePct: num(o.ball_safe_pct) ?? 0,
    touchesInPenaltyArea: num(o.touches_in_penalty_area) ?? 0,
    finalThirdEntries: num(o.final_third_entries) ?? 0,
    crosses: readRatio(o.crosses),
    dribbles: readRatio(o.dribbles),
    aerialDuels: readRatio(o.aerial_duels),
    longBalls: readRatio(o.long_balls),
    groundDuels: readRatio(o.ground_duels),
    recoveries: num(o.recoveries) ?? 0,
    duels: num(o.duels) ?? 0,
  };
}

export function parseLiveTeamStats(raw: unknown): LiveStatsBundle | null {
  if (!isObj(raw)) return null;
  const inner = isObj(raw.stats) ? (raw.stats as AnyObj) : raw;
  const home = inner.home;
  const away = inner.away;
  if (!isObj(home) || !isObj(away)) return null;
  const out: LiveStatsBundle = {
    home: readSide(home),
    away: readSide(away),
    periods: {},
  };
  if (isObj(inner.first_half)) {
    const fh = inner.first_half as AnyObj;
    if (isObj(fh.home) && isObj(fh.away)) {
      out.periods.firstHalf = { home: readSide(fh.home), away: readSide(fh.away) };
    }
  }
  if (isObj(inner.second_half)) {
    const sh = inner.second_half as AnyObj;
    if (isObj(sh.home) && isObj(sh.away)) {
      out.periods.secondHalf = { home: readSide(sh.home), away: readSide(sh.away) };
    }
  }
  return out;
}

export type StatsRowFmt = "int" | "pct" | "xg" | "ratio";
export type LiveStatsRow = {
  key: string;
  label: string;
  home: number;
  away: number;
  fmt: StatsRowFmt;
  // for ratio rows: home/away totals (denominator)
  homeTotal?: number;
  awayTotal?: number;
};

export function buildLiveStatsRows(b: LiveStatsBundle): LiveStatsRow[] {
  const { home: h, away: a } = b;
  const rows: LiveStatsRow[] = [
    { key: "shots", label: "Shots", home: h.totalShots, away: a.totalShots, fmt: "int" },
    { key: "sot", label: "Shots on target", home: h.shotsOnTarget, away: a.shotsOnTarget, fmt: "int" },
    { key: "sib", label: "Shots inside box", home: h.shotsInsideBox, away: a.shotsInsideBox, fmt: "int" },
    { key: "blocked", label: "Blocked shots", home: h.blockedShots, away: a.blockedShots, fmt: "int" },
    { key: "poss", label: "Possession", home: h.ballPossession, away: a.ballPossession, fmt: "pct" },
    { key: "xg", label: "Expected goals", home: h.expectedGoals, away: a.expectedGoals, fmt: "xg" },
    { key: "passes", label: "Passes", home: h.passes, away: a.passes, fmt: "int" },
    { key: "pass_pct", label: "Pass accuracy", home: h.passAccuracyPct, away: a.passAccuracyPct, fmt: "pct" },
    { key: "corners", label: "Corners", home: h.cornerKicks, away: a.cornerKicks, fmt: "int" },
    {
      key: "crosses", label: "Crosses (acc/total)", home: h.crosses.value, away: a.crosses.value, fmt: "ratio",
      homeTotal: h.crosses.total, awayTotal: a.crosses.total,
    },
    {
      key: "dribbles", label: "Dribbles (won/total)", home: h.dribbles.value, away: a.dribbles.value, fmt: "ratio",
      homeTotal: h.dribbles.total, awayTotal: a.dribbles.total,
    },
    {
      key: "aerial", label: "Aerial duels won", home: h.aerialDuels.value, away: a.aerialDuels.value, fmt: "ratio",
      homeTotal: h.aerialDuels.total, awayTotal: a.aerialDuels.total,
    },
    { key: "tackles_won", label: "Tackles won", home: h.tacklesWon, away: a.tacklesWon, fmt: "int" },
    { key: "interceptions", label: "Interceptions", home: h.interceptions, away: a.interceptions, fmt: "int" },
    { key: "clearances", label: "Clearances", home: h.clearances, away: a.clearances, fmt: "int" },
    { key: "touches_box", label: "Touches in box", home: h.touchesInPenaltyArea, away: a.touchesInPenaltyArea, fmt: "int" },
    { key: "fouls", label: "Fouls", home: h.fouls, away: a.fouls, fmt: "int" },
    { key: "offsides", label: "Offsides", home: h.offsides, away: a.offsides, fmt: "int" },
    { key: "yellows", label: "Yellow cards", home: h.yellowCards, away: a.yellowCards, fmt: "int" },
    { key: "reds", label: "Red cards", home: h.redCards, away: a.redCards, fmt: "int" },
    { key: "saves", label: "GK saves", home: h.goalkeeperSaves, away: a.goalkeeperSaves, fmt: "int" },
    { key: "dangerous", label: "Dangerous attacks", home: h.dangerousAttack, away: a.dangerousAttack, fmt: "int" },
  ];
  // Drop rows where both sides are zero (except always-show core rows).
  const alwaysShow = new Set(["shots", "sot", "poss", "xg", "passes", "pass_pct", "fouls", "yellows", "reds", "saves"]);
  return rows.filter((r) => alwaysShow.has(r.key) || r.home !== 0 || r.away !== 0 || (r.homeTotal ?? 0) !== 0 || (r.awayTotal ?? 0) !== 0);
}

export function formatRow(r: LiveStatsRow): { home: string; away: string } {
  switch (r.fmt) {
    case "pct":
      return { home: `${r.home.toFixed(1)}%`, away: `${r.away.toFixed(1)}%` };
    case "xg":
      return { home: r.home.toFixed(2), away: r.away.toFixed(2) };
    case "ratio":
      return {
        home: `${Math.round(r.home)}/${Math.round(r.homeTotal ?? 0)}`,
        away: `${Math.round(r.away)}/${Math.round(r.awayTotal ?? 0)}`,
      };
    default:
      return { home: String(Math.round(r.home)), away: String(Math.round(r.away)) };
  }
}

/** Build cumulative period xG points for the chart: 0 → 45 → liveMinute → end. */
export function buildPeriodXgPoints(
  b: LiveStatsBundle,
  liveMinute: number,
): { minute: number; home: number; away: number }[] {
  const pts: { minute: number; home: number; away: number }[] = [{ minute: 0, home: 0, away: 0 }];
  const fh = b.periods.firstHalf;
  const sh = b.periods.secondHalf;
  if (fh) {
    const fhH = fh.home.xgActual ?? fh.home.expectedGoals ?? 0;
    const fhA = fh.away.xgActual ?? fh.away.expectedGoals ?? 0;
    pts.push({ minute: 45, home: fhH, away: fhA });
    if (sh && liveMinute > 45) {
      const shH = sh.home.xgActual ?? sh.home.expectedGoals ?? 0;
      const shA = sh.away.xgActual ?? sh.away.expectedGoals ?? 0;
      const elapsed2nd = Math.max(0, Math.min(45, liveMinute - 45));
      const frac = elapsed2nd / 45;
      pts.push({
        minute: Math.max(45, liveMinute),
        home: fhH + shH * frac,
        away: fhA + shA * frac,
      });
    } else if (liveMinute > 45) {
      pts.push({ minute: liveMinute, home: b.home.expectedGoals, away: b.away.expectedGoals });
    }
  } else {
    if (liveMinute > 0) {
      pts.push({ minute: liveMinute, home: b.home.expectedGoals, away: b.away.expectedGoals });
    }
  }
  return pts;
}

// ─── Per-minute graphical helpers from raw /stats/ payload ────────────────

export function buildPerMinuteXgPoints(
  raw: unknown,
): { minute: number; home: number; away: number }[] | null {
  if (!isObj(raw)) return null;
  const list = Array.isArray((raw as AnyObj).xg_per_minute)
    ? ((raw as AnyObj).xg_per_minute as unknown[])
    : null;
  if (!list || list.length === 0) return null;
  const pts: { minute: number; home: number; away: number }[] = [{ minute: 0, home: 0, away: 0 }];
  let lastH = 0;
  let lastA = 0;
  for (const row of list) {
    if (!isObj(row)) continue;
    const m = num(row.m);
    if (m === null) continue;
    const cumH = num(row.cum_home);
    const cumA = num(row.cum_away);
    lastH = cumH ?? lastH;
    lastA = cumA ?? lastA;
    pts.push({ minute: m, home: lastH, away: lastA });
  }
  return pts.length >= 2 ? pts : null;
}

export type MomentumPoint = { m: number; v: number };
export function parseMomentumSeries(raw: unknown): MomentumPoint[] {
  if (!isObj(raw)) return [];
  const list = Array.isArray((raw as AnyObj).momentum)
    ? ((raw as AnyObj).momentum as unknown[])
    : null;
  if (!list) return [];
  const out: MomentumPoint[] = [];
  for (const row of list) {
    if (!isObj(row)) continue;
    const m = num(row.m);
    const v = num(row.v);
    if (m === null || v === null) continue;
    out.push({ m, v });
  }
  return out;
}

export type ShotmapShot = {
  minute: number;
  home: boolean;
  xg: number;
  type: string;
  body: string;
  situation: string;
  posX: number;
  posY: number;
  goalmouthY: number | null;
  goalmouthZ: number | null;
  playerId: number | null;
};
export function parseShotmap(raw: unknown): ShotmapShot[] {
  if (!isObj(raw)) return [];
  const list = Array.isArray((raw as AnyObj).shotmap)
    ? ((raw as AnyObj).shotmap as unknown[])
    : null;
  if (!list) return [];
  const out: ShotmapShot[] = [];
  for (const row of list) {
    if (!isObj(row)) continue;
    const pos = isObj(row.pos) ? (row.pos as AnyObj) : {};
    const gm = isObj(row.gm) ? (row.gm as AnyObj) : {};
    const px = num(pos.x);
    const py = num(pos.y);
    if (px === null || py === null) continue;
    out.push({
      minute: num(row.min) ?? 0,
      home: row.home === true,
      xg: num(row.xg) ?? 0,
      type: typeof row.type === "string" ? row.type : "shot",
      body: typeof row.body === "string" ? row.body : "",
      situation: typeof row.sit === "string" ? row.sit : "",
      posX: px,
      posY: py,
      goalmouthY: num(gm.y),
      goalmouthZ: num(gm.z),
      playerId: num(row.player_id),
    });
  }
  return out;
}

export type AveragePosition = {
  playerId: number;
  team: "home" | "away";
  x: number;
  y: number;
  jersey?: number | null;
};
export function parseAveragePositions(raw: unknown): AveragePosition[] {
  if (!isObj(raw)) return [];
  const block = (raw as AnyObj).average_positions;
  if (!isObj(block)) return [];
  const out: AveragePosition[] = [];
  for (const side of ["home", "away"] as const) {
    const teamList = (block as AnyObj)[side];
    if (!Array.isArray(teamList)) continue;
    for (const row of teamList) {
      if (!isObj(row)) continue;
      const x = num(row.x);
      const y = num(row.y);
      const pid = num(row.player_id);
      if (x === null || y === null || pid === null) continue;
      out.push({ playerId: pid, team: side, x, y, jersey: num(row.jersey_number) });
    }
  }
  return out;
}

/** Mean of momentum.v over (minute - windowMin, minute]. Positive = home pressure. */
export function recentMomentum(
  series: MomentumPoint[],
  minute: number,
  windowMin = 10,
): number {
  if (series.length === 0) return 0;
  const from = Math.max(0, minute - windowMin);
  let sum = 0;
  let n = 0;
  for (const p of series) {
    if (p.m <= minute && p.m >= from) {
      sum += p.v;
      n++;
    }
  }
  if (n === 0) {
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].m <= minute) return series[i].v;
    }
    return 0;
  }
  return sum / n;
}

/** Cumulative xG up to a given minute from `xg_per_minute`. */
export function cumXgAt(raw: unknown, minute: number): { home: number; away: number } {
  if (!isObj(raw)) return { home: 0, away: 0 };
  const list = Array.isArray((raw as AnyObj).xg_per_minute)
    ? ((raw as AnyObj).xg_per_minute as unknown[])
    : null;
  if (!list) return { home: 0, away: 0 };
  let h = 0;
  let a = 0;
  for (const row of list) {
    if (!isObj(row)) continue;
    const m = num(row.m);
    if (m === null || m > minute) continue;
    h = num(row.cum_home) ?? h;
    a = num(row.cum_away) ?? a;
  }
  return { home: h, away: a };
}
