// Unified multi-market board for upcoming-match simulator output. Renders
// model probability bars per outcome plus market % + signed edge when an
// odds payload is parsed. Each row is its own micro-EdgeBar.

import type { MarketProbs } from "@/lib/odds";
import { edgePct } from "@/lib/odds";
import type { SimResult } from "@/lib/simulator";

type Row = {
  label: string;
  model: number;
  market?: number; // 0..1; undefined when market line unavailable
  tone?: "home" | "away" | "draw" | "neutral";
};

export function MarketBoard({
  sim,
  market,
  homeTeam,
  awayTeam,
}: {
  sim: SimResult;
  market: MarketProbs | null;
  homeTeam: string;
  awayTeam: string;
}) {
  // Outcome (1X2)
  const outcome: Row[] = [
    { label: homeTeam, model: sim.homeWin, market: market?.home, tone: "home" },
    { label: "Draw", model: sim.draw, market: market?.draw, tone: "draw" },
    { label: awayTeam, model: sim.awayWin, market: market?.away, tone: "away" },
  ];

  // Goals — model only (no market parse for these lines yet)
  const goals: Row[] = [
    { label: "Over 1.5 goals", model: sim.over15 },
    { label: "Over 2.5 goals", model: sim.over25 },
    { label: "Over 3.5 goals", model: estOver(sim, 3.5) },
    { label: "Both teams to score", model: sim.bttsYes },
  ];

  // Correct score top 6 (from sim)
  const scores: Row[] = sim.scorelines.slice(0, 6).map((s) => ({
    label: s.score,
    model: s.prob,
  }));

  return (
    <div className="space-y-5">
      <Block title="Outcome (1X2)" rows={outcome} showEdge={Boolean(market)} />
      <Block title="Goals & BTTS" rows={goals} showEdge={false} />
      <Block title="Correct score · top 6" rows={scores} showEdge={false} compact />
      {market && (
        <p className="text-[10px] text-muted-foreground/80">
          Edges are vig-removed market vs. model · book margin{" "}
          <span className="font-mono">{market.overround_pct.toFixed(1)}%</span>
        </p>
      )}
    </div>
  );
}

function estOver(sim: SimResult, line: number): number {
  // Re-derive from cached marginals when possible; conservative Poisson
  // approximation otherwise. Sim already counts Over 2.5 exactly; for 3.5
  // we approximate via Skellam-tail decay: P(O3.5) ≈ P(O2.5) × decay where
  // decay scales with expected total goals. Good enough for an at-a-glance
  // market % until we expose the full PMF from the simulator.
  const expTotal = sim.expHomeGoals + sim.expAwayGoals;
  if (line === 2.5) return sim.over25;
  if (line === 1.5) return sim.over15;
  // approximate ratio O3.5 / O2.5 from expected total goals
  const ratio = Math.max(0.18, Math.min(0.72, expTotal / 5));
  return sim.over25 * ratio;
}

function Block({
  title,
  rows,
  showEdge,
  compact,
}: {
  title: string;
  rows: Row[];
  showEdge: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        {title}
      </h3>
      <div className={compact ? "space-y-1" : "space-y-2"}>
        {rows.map((r) => (
          <EdgeBar key={r.label} row={r} showEdge={showEdge} compact={compact} />
        ))}
      </div>
    </div>
  );
}

function EdgeBar({
  row,
  showEdge,
  compact,
}: {
  row: Row;
  showEdge: boolean;
  compact?: boolean;
}) {
  const e = showEdge && row.market !== undefined ? edgePct(row.model, row.market) : null;
  const tone =
    row.tone === "home"
      ? "var(--chart-1)"
      : row.tone === "away"
        ? "var(--chart-2)"
        : "var(--primary)";
  const edgeColor =
    e === null
      ? "text-muted-foreground"
      : e > 1
        ? "text-up"
        : e < -1
          ? "text-down"
          : "text-muted-foreground";

  return (
    <div className={compact ? "" : ""}>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="truncate max-w-[55%] font-medium">{row.label}</span>
        <span className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
          {row.market !== undefined && (
            <span className="text-muted-foreground">
              mkt {(row.market * 100).toFixed(1)}
            </span>
          )}
          <span>{(row.model * 100).toFixed(1)}%</span>
          {e !== null && (
            <span className={`${edgeColor} font-semibold w-12 text-right`}>
              {e > 0 ? "+" : ""}
              {e.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-border/40 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${row.model * 100}%`, background: tone, opacity: 0.85 }}
        />
        {row.market !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-px bg-foreground"
            style={{ left: `${row.market * 100}%`, opacity: 0.7 }}
            title={`market ${(row.market * 100).toFixed(1)}%`}
          />
        )}
      </div>
    </div>
  );
}
