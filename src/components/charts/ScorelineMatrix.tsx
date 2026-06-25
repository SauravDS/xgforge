// Analytical Poisson scoreline matrix. Computes P(H=i, A=j) = P(H=i)·P(A=j)
// for i,j in [0..MAX], plus marginals for 1X2/BTTS/Over markets. More precise
// than Monte Carlo bucket counts for low-probability scorelines.

import { useMemo } from "react";

const MAX = 6;

function poissonPmf(lambda: number, k: number): number {
  // P(X=k) = e^-λ · λ^k / k!
  let logP = -lambda + k * Math.log(Math.max(1e-9, lambda));
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function buildMatrix(lh: number, la: number): number[][] {
  const H = Array.from({ length: MAX + 1 }, (_, i) => poissonPmf(lh, i));
  const A = Array.from({ length: MAX + 1 }, (_, j) => poissonPmf(la, j));
  return H.map((ph) => A.map((pa) => ph * pa));
}

export function ScorelineMatrix({
  lambdaHome,
  lambdaAway,
  homeLabel = "H",
  awayLabel = "A",
}: {
  lambdaHome: number;
  lambdaAway: number;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const { matrix, maxCell, mostLikely } = useMemo(() => {
    const m = buildMatrix(lambdaHome, lambdaAway);
    let max = 0;
    let best = { i: 0, j: 0, p: 0 };
    for (let i = 0; i <= MAX; i++) {
      for (let j = 0; j <= MAX; j++) {
        const p = m[i][j];
        if (p > max) max = p;
        if (p > best.p) best = { i, j, p };
      }
    }
    return { matrix: m, maxCell: max, mostLikely: best };
  }, [lambdaHome, lambdaAway]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Scoreline matrix
        </h3>
        <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
          peak {mostLikely.i}–{mostLikely.j} · {(mostLikely.p * 100).toFixed(1)}%
        </div>
      </div>
      <div className="relative">
        {/* away axis label */}
        <div className="absolute -top-3 left-7 right-0 text-center text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
          {awayLabel} goals →
        </div>
        <div className="flex">
          {/* home axis label */}
          <div className="flex flex-col justify-center pr-1">
            <div
              className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {homeLabel} goals ↑
            </div>
          </div>
          <div className="flex-1">
            {/* header row */}
            <div
              className="grid gap-0.5 mb-0.5"
              style={{ gridTemplateColumns: `1.25rem repeat(${MAX + 1}, minmax(0, 1fr))` }}
            >
              <span />
              {Array.from({ length: MAX + 1 }, (_, j) => (
                <span
                  key={j}
                  className="text-center text-[9px] font-mono text-muted-foreground tabular-nums"
                >
                  {j}
                </span>
              ))}
            </div>
            {/* rows top-down: home goals high → low (visually intuitive) */}
            {Array.from({ length: MAX + 1 }, (_, ii) => {
              const i = MAX - ii;
              return (
                <div
                  key={i}
                  className="grid gap-0.5 mb-0.5"
                  style={{ gridTemplateColumns: `1.25rem repeat(${MAX + 1}, minmax(0, 1fr))` }}
                >
                  <span className="text-right text-[9px] font-mono text-muted-foreground tabular-nums pr-1 self-center">
                    {i}
                  </span>
                  {Array.from({ length: MAX + 1 }, (_, j) => {
                    const p = matrix[i][j];
                    const intensity = maxCell > 0 ? p / maxCell : 0;
                    const isPeak = i === mostLikely.i && j === mostLikely.j;
                    const tone =
                      i > j
                        ? "var(--chart-1)"
                        : j > i
                          ? "var(--chart-2)"
                          : "var(--muted-foreground)";
                    return (
                      <div
                        key={j}
                        title={`${i}-${j} · ${(p * 100).toFixed(2)}%`}
                        className="aspect-square rounded-[3px] relative flex items-center justify-center"
                        style={{
                          background: `color-mix(in oklab, ${tone} ${Math.round(intensity * 75)}%, transparent)`,
                          outline: isPeak ? "1px solid var(--foreground)" : "none",
                          outlineOffset: -1,
                        }}
                      >
                        {p >= 0.04 && (
                          <span className="text-[8.5px] font-mono tabular-nums text-foreground/80">
                            {(p * 100).toFixed(0)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
