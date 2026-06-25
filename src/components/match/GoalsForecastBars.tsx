// Simulated goal totals per team (0..6) rendered as side-by-side histograms.
// Pulls the PMF from sim.scorelines (already aggregated by the simulator).

import type { SimResult } from "@/lib/simulator";

export function GoalsForecastBars({
  sim,
  homeTeam,
  awayTeam,
}: {
  sim: SimResult;
  homeTeam: string;
  awayTeam: string;
}) {
  const maxGoals = 6;
  const homePMF = new Array(maxGoals + 1).fill(0) as number[];
  const awayPMF = new Array(maxGoals + 1).fill(0) as number[];
  // sim.scorelines is top-6 — re-derive from lambdas via Poisson PMF for
  // a smoother chart that's not capped at top scorelines.
  const lh = sim.lambdaHome;
  const la = sim.lambdaAway;
  for (let i = 0; i <= maxGoals; i++) {
    homePMF[i] = poissonPMF(i, lh);
    awayPMF[i] = poissonPMF(i, la);
  }
  // Bucket 6 = "6+"
  homePMF[maxGoals] = 1 - homePMF.slice(0, maxGoals).reduce((a, b) => a + b, 0);
  awayPMF[maxGoals] = 1 - awayPMF.slice(0, maxGoals).reduce((a, b) => a + b, 0);
  const peakH = Math.max(...homePMF);
  const peakA = Math.max(...awayPMF);
  const peak = Math.max(peakH, peakA);

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-semibold tracking-tight text-sm">Goals forecast</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
          λ {lh.toFixed(2)} – {la.toFixed(2)}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Histogram team={homeTeam} pmf={homePMF} peak={peak} tone="var(--chart-1)" />
        <Histogram team={awayTeam} pmf={awayPMF} peak={peak} tone="var(--chart-2)" />
      </div>
    </section>
  );
}

function Histogram({
  team,
  pmf,
  peak,
  tone,
}: {
  team: string;
  pmf: number[];
  peak: number;
  tone: string;
}) {
  const modeIdx = pmf.reduce((iMax, x, i, arr) => (x > arr[iMax] ? i : iMax), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tone }} />
          <span className="font-semibold text-sm truncate">{team}</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          most likely <span className="font-mono text-foreground">{modeIdx}</span>
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {pmf.map((p, i) => {
          const h = peak > 0 ? (p / peak) * 100 : 0;
          const active = i === modeIdx;
          return (
            <div key={i} className="flex flex-col items-center justify-end flex-1 min-w-0">
              <div className="text-[9px] font-mono tabular-nums text-muted-foreground mb-0.5">
                {(p * 100).toFixed(0)}
              </div>
              <div
                className="w-full rounded-t transition-[height] duration-500"
                style={{
                  height: `${h}%`,
                  background: tone,
                  opacity: active ? 0.95 : 0.55,
                  minHeight: 2,
                }}
              />
              <div className="text-[10px] font-mono tabular-nums mt-1 text-muted-foreground">
                {i === pmf.length - 1 ? `${i}+` : i}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function poissonPMF(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  // k! via iterative product (k ≤ 6 here)
  let fact = 1;
  for (let i = 2; i <= k; i++) fact *= i;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact;
}
