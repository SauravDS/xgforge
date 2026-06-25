// Best-effort, schema-tolerant adapters that turn BSD's incidents/statistics
// JSON into typed shapes our charts consume. We deliberately accept loose
// inputs because the upstream schema occasionally varies by sport/league.

import type { XgPoint } from "@/components/charts/XgProgression";

type AnyObj = Record<string, unknown>;
function isObj(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (isObj(v)) {
    for (const k of ["results", "incidents", "items", "statistics", "data"]) {
      const inner = v[k];
      if (Array.isArray(inner)) return inner;
    }
  }
  return [];
}
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace("%", "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// ---- Shared incident helpers -----------------------------------------------

export type IncidentSide = "home" | "away" | "neutral";

export function incidentSide(
  raw: AnyObj,
  homeTeamId?: number,
  awayTeamId?: number,
): IncidentSide {
  if (typeof raw.is_home === "boolean") return raw.is_home ? "home" : "away";
  const side = typeof raw.side === "string" ? raw.side.toLowerCase() : undefined;
  if (side === "home" || side === "away") return side;
  const teamId = num(raw.team_id ?? raw.team ?? raw.side_id);
  if (teamId !== null) {
    if (homeTeamId !== undefined && teamId === homeTeamId) return "home";
    if (awayTeamId !== undefined && teamId === awayTeamId) return "away";
  }
  return "neutral";
}

export function incidentPlayer(raw: AnyObj): string | undefined {
  return str(raw.player_name) ?? str(raw.player);
}
export function incidentAssist(raw: AnyObj): string | undefined {
  return (
    str(raw.assist_player_name) ??
    str(raw.assist_player) ??
    str(raw.assist) ??
    str(raw.assist_name)
  );
}
export function incidentPlayerIn(raw: AnyObj): string | undefined {
  return str(raw.player_in) ?? str(raw.in) ?? str(raw.player_in_name);
}
export function incidentPlayerOut(raw: AnyObj): string | undefined {
  return str(raw.player_out) ?? str(raw.out) ?? str(raw.player_out_name);
}
export function incidentMinute(raw: AnyObj): number {
  return num(raw.minute ?? raw.time ?? raw.match_minute) ?? 0;
}

export type IncidentKind =
  | "goal"
  | "own_goal"
  | "penalty_goal"
  | "missed_penalty"
  | "shot"
  | "shot_on_target"
  | "card_yellow"
  | "card_red"
  | "card_second_yellow"
  | "substitution"
  | "var"
  | "period"
  | "corner"
  | "foul"
  | "offside"
  | "injury"
  | "unknown";

export function classifyIncident(raw: AnyObj): IncidentKind {
  const t = String(raw.incident_type ?? raw.type ?? "").toLowerCase();
  const goalType = String(raw.goal_type ?? "").toLowerCase();
  const cardType = String(raw.card_type ?? "").toLowerCase();
  if (!t) return "unknown";

  // Period markers ("First half", "Half-time", etc.)
  if (t === "period" || t.includes("half") || t === "kickoff" || t === "fulltime") return "period";

  if (t === "card" || t.includes("card")) {
    if (cardType === "yellowred" || cardType === "second_yellow" || t.includes("second")) return "card_second_yellow";
    if (cardType === "red" || t.includes("red")) return "card_red";
    if (cardType === "yellow" || t.includes("yellow")) return "card_yellow";
    return "card_yellow";
  }

  if (t.includes("substitut") || t === "sub") return "substitution";
  if (t.includes("var")) return "var";

  if (t.includes("missed") && (t.includes("pen") || goalType.includes("pen"))) return "missed_penalty";
  if (t.includes("pen") && t.includes("goal")) return "penalty_goal";
  if (t.includes("own") && t.includes("goal")) return "own_goal";
  if (t === "goal" || (t.includes("goal") && !t.includes("missed") && !t.includes("disallowed"))) {
    if (goalType.includes("own")) return "own_goal";
    if (goalType.includes("pen")) return "penalty_goal";
    return "goal";
  }

  if (t.includes("shot_on") || t === "shot_on_target" || t.includes("on_target")) return "shot_on_target";
  if (t.includes("shot")) return "shot";
  if (t.includes("corner")) return "corner";
  if (t.includes("foul")) return "foul";
  if (t.includes("offside")) return "offside";
  if (t.includes("injur")) return "injury";
  return "unknown";
}

function isGoalKind(k: IncidentKind): boolean {
  return k === "goal" || k === "penalty_goal";
}

// ---- xG progression ---------------------------------------------------------

export function buildXgProgression(
  incidents: unknown,
  homeTeamId?: number,
  awayTeamId?: number,
): XgPoint[] {
  const list = asArray(incidents);
  let h = 0;
  let a = 0;
  const out: XgPoint[] = [{ minute: 0, home: 0, away: 0 }];
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const kind = classifyIncident(raw);
    if (!isGoalKind(kind) && kind !== "shot" && kind !== "shot_on_target") continue;
    const xg = num(raw.xg ?? raw.expected_goals ?? raw.x_g);
    if (xg === null) continue;
    const minute = incidentMinute(raw);
    const side = incidentSide(raw, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    if (side === "home") h += xg;
    else a += xg;
    out.push({ minute, home: h, away: a });
  }
  return out;
}

/** Model-derived expected-xG path (straight per-minute interpolation of λ). */
export function buildModelXgPath(
  lambdaHome: number,
  lambdaAway: number,
  upToMinute: number = 90,
): XgPoint[] {
  const out: XgPoint[] = [];
  const end = Math.max(5, Math.min(120, Math.round(upToMinute)));
  for (let m = 0; m <= end; m += 5) {
    out.push({
      minute: m,
      home: (lambdaHome * m) / 90,
      away: (lambdaAway * m) / 90,
    });
  }
  if (out[out.length - 1]?.minute !== end) {
    out.push({ minute: end, home: (lambdaHome * end) / 90, away: (lambdaAway * end) / 90 });
  }
  return out;
}

// ---- Shot events (for xG dots overlay) -------------------------------------

export type ShotEvent = {
  minute: number;
  xg: number;
  team: "home" | "away";
  isGoal: boolean;
  player?: string;
};

export function buildShotEvents(
  incidents: unknown,
  homeTeamId?: number,
  awayTeamId?: number,
): ShotEvent[] {
  const list = asArray(incidents);
  const out: ShotEvent[] = [];
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const kind = classifyIncident(raw);
    const isShotLike =
      kind === "shot" || kind === "shot_on_target" || isGoalKind(kind);
    if (!isShotLike) continue;
    const xg = num(raw.xg ?? raw.expected_goals ?? raw.x_g);
    if (xg === null) continue;
    const side = incidentSide(raw, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    out.push({
      minute: incidentMinute(raw),
      xg,
      team: side,
      isGoal: isGoalKind(kind),
      player: incidentPlayer(raw),
    });
  }
  return out;
}

// ---- Pressure proxy (when no shot-level data) ------------------------------

export type PressureBucket = { minute: number; home: number; away: number };

const PRESSURE_WEIGHTS: Partial<Record<IncidentKind, number>> = {
  goal: 4,
  penalty_goal: 4,
  own_goal: 3,
  missed_penalty: 3,
  shot_on_target: 3,
  shot: 2,
  corner: 1.5,
  card_yellow: 1.2,
  card_red: 1.6,
  card_second_yellow: 1.6,
  foul: 0.6,
  substitution: 0.3,
};

export function buildPressureBuckets(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  upToMinute: number = 90,
  bucketMinutes: number = 5,
): PressureBucket[] {
  const list = asArray(incidents);
  const end = Math.max(bucketMinutes, Math.min(120, Math.round(upToMinute)));
  const count = Math.ceil(end / bucketMinutes);
  const arr: PressureBucket[] = Array.from({ length: count }, (_, i) => ({
    minute: i * bucketMinutes,
    home: 0,
    away: 0,
  }));
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const kind = classifyIncident(raw);
    if (kind === "period" || kind === "unknown" || kind === "var") continue;
    const side = incidentSide(raw, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    // Foul / card weight applies to the *opposing* team's pressure (they were fouled / drew the card)
    let attackingSide: "home" | "away" = side;
    if (kind === "foul" || kind === "card_yellow" || kind === "card_red" || kind === "card_second_yellow") {
      attackingSide = side === "home" ? "away" : "home";
    }
    const w = PRESSURE_WEIGHTS[kind] ?? 0;
    if (!w) continue;
    const idx = Math.min(count - 1, Math.max(0, Math.floor(incidentMinute(raw) / bucketMinutes)));
    arr[idx][attackingSide] += w;
  }
  return arr;
}

// ---- Stats grid -------------------------------------------------------------

export type StatRow = {
  key: string;
  label: string;
  home: number;
  away: number;
  format?: "int" | "pct" | "dec1";
};

const STAT_LABELS: Record<string, { label: string; format: StatRow["format"] }> = {
  possession: { label: "Possession", format: "pct" },
  ball_possession: { label: "Possession", format: "pct" },
  shots_total: { label: "Shots", format: "int" },
  total_shots: { label: "Shots", format: "int" },
  shots_on_target: { label: "On target", format: "int" },
  shots_on_goal: { label: "On target", format: "int" },
  shots_off_target: { label: "Off target", format: "int" },
  expected_goals: { label: "xG", format: "dec1" },
  corners: { label: "Corners", format: "int" },
  corner_kicks: { label: "Corners", format: "int" },
  fouls: { label: "Fouls", format: "int" },
  yellow_cards: { label: "Yellow", format: "int" },
  red_cards: { label: "Red", format: "int" },
  passes: { label: "Passes", format: "int" },
  pass_accuracy: { label: "Pass %", format: "pct" },
  offsides: { label: "Offside", format: "int" },
  saves: { label: "Saves", format: "int" },
  goals: { label: "Goals", format: "int" },
  substitutions: { label: "Subs used", format: "int" },
};

export function buildStatsGrid(statistics: unknown): StatRow[] {
  if (!statistics) return [];
  const out: StatRow[] = [];

  // Shape A: { home: {...}, away: {...} }
  if (isObj(statistics) && isObj(statistics.home) && isObj(statistics.away)) {
    const home = statistics.home as AnyObj;
    const away = statistics.away as AnyObj;
    const keys = new Set([...Object.keys(home), ...Object.keys(away)]);
    for (const k of keys) {
      const hv = num(home[k]);
      const av = num(away[k]);
      if (hv === null && av === null) continue;
      const meta = STAT_LABELS[k];
      out.push({
        key: k,
        label: meta?.label ?? prettify(k),
        home: hv ?? 0,
        away: av ?? 0,
        format: meta?.format ?? "int",
      });
    }
    return rankAndTrim(out);
  }

  // Shape B: array of { name|key, home, away }
  const list = asArray(statistics);
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const key = String(raw.key ?? raw.name ?? raw.type ?? "").toLowerCase();
    if (!key) continue;
    const hv = num(raw.home ?? raw.home_value);
    const av = num(raw.away ?? raw.away_value);
    if (hv === null && av === null) continue;
    const meta = STAT_LABELS[key];
    out.push({
      key,
      label: meta?.label ?? prettify(key),
      home: hv ?? 0,
      away: av ?? 0,
      format: meta?.format ?? "int",
    });
  }
  return rankAndTrim(out);
}

/**
 * Derive a stats grid purely from incidents + score line, for when the
 * statistics endpoint hasn't been published yet (common during 1st half).
 */
export function buildStatsFromIncidents(
  incidents: unknown,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  homeScore?: number | null,
  awayScore?: number | null,
): StatRow[] {
  const list = asArray(incidents);
  const counts: Record<string, { home: number; away: number }> = {
    goals: { home: 0, away: 0 },
    shots_total: { home: 0, away: 0 },
    shots_on_target: { home: 0, away: 0 },
    corners: { home: 0, away: 0 },
    yellow_cards: { home: 0, away: 0 },
    red_cards: { home: 0, away: 0 },
    fouls: { home: 0, away: 0 },
    offsides: { home: 0, away: 0 },
    substitutions: { home: 0, away: 0 },
  };
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const kind = classifyIncident(raw);
    const side = incidentSide(raw, homeTeamId, awayTeamId);
    if (side === "neutral") continue;
    switch (kind) {
      case "goal":
      case "penalty_goal":
        counts.goals[side]++;
        counts.shots_total[side]++;
        counts.shots_on_target[side]++;
        break;
      case "own_goal":
        // own goal credits the opponent
        counts.goals[side === "home" ? "away" : "home"]++;
        break;
      case "shot_on_target":
        counts.shots_total[side]++;
        counts.shots_on_target[side]++;
        break;
      case "shot":
        counts.shots_total[side]++;
        break;
      case "corner":
        counts.corners[side]++;
        break;
      case "card_yellow":
      case "card_second_yellow":
        counts.yellow_cards[side]++;
        if (kind === "card_second_yellow") counts.red_cards[side]++;
        break;
      case "card_red":
        counts.red_cards[side]++;
        break;
      case "foul":
        counts.fouls[side]++;
        break;
      case "offside":
        counts.offsides[side]++;
        break;
      case "substitution":
        counts.substitutions[side]++;
        break;
    }
  }
  // Override goals from score line when present (authoritative).
  if (typeof homeScore === "number" && typeof awayScore === "number") {
    counts.goals.home = homeScore;
    counts.goals.away = awayScore;
  }
  const rows: StatRow[] = [];
  for (const [key, v] of Object.entries(counts)) {
    if (v.home === 0 && v.away === 0 && key !== "goals") continue;
    const meta = STAT_LABELS[key];
    rows.push({
      key,
      label: meta?.label ?? prettify(key),
      home: v.home,
      away: v.away,
      format: meta?.format ?? "int",
    });
  }
  return rankAndTrim(rows);
}

function rankAndTrim(rows: StatRow[]): StatRow[] {
  const order = [
    "possession",
    "ball_possession",
    "goals",
    "expected_goals",
    "shots_total",
    "total_shots",
    "shots_on_target",
    "shots_on_goal",
    "corners",
    "corner_kicks",
    "passes",
    "pass_accuracy",
    "fouls",
    "yellow_cards",
    "red_cards",
    "offsides",
    "saves",
    "substitutions",
  ];
  return rows
    .slice()
    .sort((a, b) => {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .slice(0, 12);
}

function prettify(k: string): string {
  return k
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStat(v: number, format: StatRow["format"]): string {
  switch (format) {
    case "pct":
      return `${Math.round(v)}%`;
    case "dec1":
      return v.toFixed(1);
    default:
      return String(Math.round(v));
  }
}

// ---- Timeline incidents -----------------------------------------------------

export type TimelineEvent = {
  minute: number;
  kind: IncidentKind;
  team: IncidentSide;
  label: string;
  player?: string;
  assist?: string;
  playerIn?: string;
  playerOut?: string;
  detail?: string;
};

export function buildTimeline(
  incidents: unknown,
  homeTeamId?: number,
  awayTeamId?: number,
): TimelineEvent[] {
  const list = asArray(incidents);
  const out: TimelineEvent[] = [];
  for (const raw of list) {
    if (!isObj(raw)) continue;
    const kind = classifyIncident(raw);
    if (kind === "unknown") continue;
    if (kind === "foul" || kind === "offside") continue; // too noisy for the timeline
    const minute = incidentMinute(raw);
    const team = incidentSide(raw, homeTeamId, awayTeamId);
    const label = humanizeKind(kind, raw);
    if (!label) continue;
    out.push({
      minute,
      kind,
      team: kind === "period" ? "neutral" : team,
      label,
      player: incidentPlayer(raw),
      assist: incidentAssist(raw),
      playerIn: incidentPlayerIn(raw),
      playerOut: incidentPlayerOut(raw),
      detail: str(raw.detail) ?? str(raw.text),
    });
  }
  return out.sort((a, b) => a.minute - b.minute);
}

function humanizeKind(kind: IncidentKind, raw: AnyObj): string | null {
  switch (kind) {
    case "goal":
      return "Goal";
    case "penalty_goal":
      return "Penalty";
    case "own_goal":
      return "Own goal";
    case "missed_penalty":
      return "Penalty missed";
    case "card_yellow":
      return "Yellow card";
    case "card_red":
      return "Red card";
    case "card_second_yellow":
      return "Second yellow";
    case "substitution":
      return "Substitution";
    case "var":
      return "VAR review";
    case "period":
      return str(raw.text) ?? "Period";
    case "corner":
    case "shot":
    case "shot_on_target":
    case "injury":
    case "foul":
    case "offside":
    case "unknown":
      return null;
  }
}
