// 5000-run Monte Carlo Poisson match simulator. Pure function, no deps.

export type SimResult = {
  runs: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  bttsYes: number;
  over25: number;
  over15: number;
  expHomeGoals: number;
  expAwayGoals: number;
  /** Top scorelines, sorted by probability desc. */
  scorelines: { score: string; prob: number }[];
  lambdaHome: number;
  lambdaAway: number;
};

// Deterministic seedable PRNG for reproducible runs.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample a Poisson(lambda) via Knuth's algorithm. */
function samplePoisson(lambda: number, rng: () => number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  // Cap loops to prevent infinite runs on bad input.
  while (k < 12) {
    k++;
    p *= rng();
    if (p <= L) return k - 1;
  }
  return k - 1;
}

export function simulateMatch(
  lambdaHome: number,
  lambdaAway: number,
  opts: { runs?: number; seed?: number } = {},
): SimResult {
  const runs = opts.runs ?? 5000;
  const rng = mulberry32(opts.seed ?? 1337);
  let hWin = 0;
  let aWin = 0;
  let draw = 0;
  let btts = 0;
  let over25 = 0;
  let over15 = 0;
  let sumH = 0;
  let sumA = 0;
  const scoreCounts = new Map<string, number>();
  for (let i = 0; i < runs; i++) {
    const h = samplePoisson(lambdaHome, rng);
    const a = samplePoisson(lambdaAway, rng);
    sumH += h;
    sumA += a;
    if (h > a) hWin++;
    else if (a > h) aWin++;
    else draw++;
    if (h > 0 && a > 0) btts++;
    const total = h + a;
    if (total > 2) over25++;
    if (total > 1) over15++;
    const key = `${h}-${a}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }
  const scorelines = [...scoreCounts.entries()]
    .map(([score, n]) => ({ score, prob: n / runs }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 6);
  return {
    runs,
    homeWin: hWin / runs,
    draw: draw / runs,
    awayWin: aWin / runs,
    bttsYes: btts / runs,
    over25: over25 / runs,
    over15: over15 / runs,
    expHomeGoals: sumH / runs,
    expAwayGoals: sumA / runs,
    scorelines,
    lambdaHome,
    lambdaAway,
  };
}

/** Derive lambdas from model probabilities (no market data fallback). */
export function lambdasFromModel(pHome: number, pAway: number): {
  lambdaHome: number;
  lambdaAway: number;
} {
  const total = pHome + pAway;
  const norm = total > 0 ? { h: pHome / total, a: pAway / total } : { h: 0.5, a: 0.5 };
  const supremacy = (norm.h - norm.a) * 2.4;
  const baseTotal = 2.6;
  const lambdaHome = Math.max(0.2, (baseTotal + supremacy) / 2);
  const lambdaAway = Math.max(0.2, (baseTotal - supremacy) / 2);
  return { lambdaHome, lambdaAway };
}
