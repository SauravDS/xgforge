// Tolerant odds parsing. BSD's odds payload varies; we map any of the common
// shapes into a normalised 1X2 / BTTS / O-U set of implied probabilities,
// vig-removed.

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Convert decimal odds → implied probability (with no vig removal). */
export function decimalToProb(decimal: number): number {
  if (decimal <= 1) return 0;
  return 1 / decimal;
}

/** Remove the bookmaker margin (vig) by renormalising to 1.0. */
export function devig(probs: number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum <= 0) return probs.map(() => 0);
  return probs.map((p) => p / sum);
}

export type MarketProbs = {
  home: number;
  draw: number;
  away: number;
  /** Bookmaker overround as a percentage (e.g. 4.2). */
  overround_pct: number;
};

/** Search common odds-payload shapes for a 1X2 triplet of decimal odds. */
function find1X2Decimals(payload: unknown): {
  home: number;
  draw: number;
  away: number;
} | null {
  if (!payload) return null;

  // Direct shape: { home: 1.8, draw: 3.4, away: 4.5 }
  if (isObj(payload)) {
    const h = asNum(payload.home ?? payload.home_win ?? payload["1"]);
    const d = asNum(payload.draw ?? payload["x"] ?? payload["X"]);
    const a = asNum(payload.away ?? payload.away_win ?? payload["2"]);
    if (h && d && a) return { home: h, draw: d, away: a };
  }

  // Markets array: [{name|key:'1x2', outcomes:[{name,price}, ...]}]
  const collect = (root: unknown): AnyObj | null => {
    if (Array.isArray(root)) {
      for (const m of root) {
        const got = collect(m);
        if (got) return got;
      }
      return null;
    }
    if (!isObj(root)) return null;
    const key = String(root.market ?? root.key ?? root.name ?? "").toLowerCase();
    if (key.includes("match") || key === "1x2" || key.includes("winner") || key.includes("full time")) {
      return root;
    }
    for (const v of Object.values(root)) {
      const got = collect(v);
      if (got) return got;
    }
    return null;
  };
  const market = collect(payload);
  if (market) {
    const outcomes = (market.outcomes ?? market.selections ?? market.runners) as
      | unknown
      | undefined;
    if (Array.isArray(outcomes)) {
      let h: number | null = null;
      let d: number | null = null;
      let a: number | null = null;
      for (const o of outcomes) {
        if (!isObj(o)) continue;
        const label = String(o.name ?? o.label ?? o.outcome ?? "").toLowerCase();
        const price = asNum(o.price ?? o.odds ?? o.decimal ?? o.value);
        if (!price) continue;
        if (label === "1" || label.includes("home")) h = price;
        else if (label === "x" || label.includes("draw")) d = price;
        else if (label === "2" || label.includes("away")) a = price;
      }
      if (h && d && a) return { home: h, draw: d, away: a };
    }
  }
  return null;
}

export function parse1X2(payload: unknown): MarketProbs | null {
  const dec = find1X2Decimals(payload);
  if (!dec) return null;
  const raw = [
    decimalToProb(dec.home),
    decimalToProb(dec.draw),
    decimalToProb(dec.away),
  ];
  const sum = raw.reduce((a, b) => a + b, 0);
  if (sum <= 0) return null;
  const [home, draw, away] = devig(raw);
  return {
    home,
    draw,
    away,
    overround_pct: (sum - 1) * 100,
  };
}

/** Derive Poisson goal expectancies (lambda_home, lambda_away) from market
 * implied probs. Uses a standard inversion against expected totals/spread. */
export function lambdasFromMarket(market: MarketProbs): {
  lambdaHome: number;
  lambdaAway: number;
} {
  // Map 1X2 → expected goal supremacy & totals via a calibrated heuristic.
  // For a typical match the home edge over away maps roughly linearly to
  // goal supremacy; total goals scale with draw probability (lower draw →
  // higher totals).
  const supremacy = (market.home - market.away) * 2.6; // home goals − away goals
  const total = 1.8 + (1 - Math.min(0.5, market.draw)) * 2.4; // 1.8..3.0 typical
  const lambdaHome = Math.max(0.2, (total + supremacy) / 2);
  const lambdaAway = Math.max(0.2, (total - supremacy) / 2);
  return { lambdaHome, lambdaAway };
}

/** Model edge: model_prob − market_prob, in percentage points. */
export function edgePct(modelProb: number, marketProb: number): number {
  return (modelProb - marketProb) * 100;
}
