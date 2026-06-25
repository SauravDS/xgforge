// Market vs model 1X2 edge bar — three rows, market vs model side-by-side
// with signed edge arrow. Pure presentation.

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import type { MarketProbs } from "@/lib/odds";

export function OddsVsModel({
  market,
  model,
  homeLabel,
  awayLabel,
}: {
  market: MarketProbs | null;
  model: { home: number; draw: number; away: number };
  homeLabel: string;
  awayLabel: string;
}) {
  if (!market) {
    return <ModelOnly model={model} homeLabel={homeLabel} awayLabel={awayLabel} />;
  }
  const rows: { label: string; key: "home" | "draw" | "away"; tone: string }[] = [
    { label: homeLabel, key: "home", tone: "var(--chart-1)" },
    { label: "Draw", key: "draw", tone: "hsl(var(--muted-foreground))" },
    { label: awayLabel, key: "away", tone: "var(--chart-2)" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_64px_64px_72px] gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1">
        <span>Outcome</span>
        <span className="text-right">Market</span>
        <span className="text-right">Model</span>
        <span className="text-right">Edge</span>
      </div>
      {rows.map((r) => {
        const m = market[r.key];
        const mo = model[r.key];
        const edge = mo - m;
        return (
          <div key={r.key} className="grid grid-cols-[1fr_64px_64px_72px] items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: r.tone }} />
              <span className="text-sm truncate">{r.label}</span>
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
              {(m * 100).toFixed(0)}%
            </span>
            <span className="text-right font-mono text-sm tabular-nums">
              {(mo * 100).toFixed(0)}%
            </span>
            <EdgeChip edge={edge} />
          </div>
        );
      })}
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-2 font-mono">
        overround {market.overround_pct.toFixed(1)}%
      </div>
    </div>
  );
}

function EdgeChip({ edge }: { edge: number }) {
  const pct = edge * 100;
  const abs = Math.abs(pct);
  const Icon = pct > 1.5 ? ArrowUpRight : pct < -1.5 ? ArrowDownRight : Minus;
  const tone =
    pct > 1.5
      ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/30"
      : pct < -1.5
        ? "text-rose-300 bg-rose-500/15 border-rose-500/30"
        : "text-muted-foreground bg-surface-1/60 border-border/60";
  return (
    <span
      className={`inline-flex items-center gap-1 justify-end rounded border px-1.5 py-0.5 font-mono text-xs tabular-nums ${tone}`}
    >
      <Icon className="h-3 w-3" />
      {(pct >= 0 ? "+" : "−") + abs.toFixed(1)}
    </span>
  );
}

function ModelOnly({
  model,
  homeLabel,
  awayLabel,
}: {
  model: { home: number; draw: number; away: number };
  homeLabel: string;
  awayLabel: string;
}) {
  const rows: { label: string; key: "home" | "draw" | "away"; tone: string }[] = [
    { label: homeLabel, key: "home", tone: "var(--chart-1)" },
    { label: "Draw", key: "draw", tone: "hsl(var(--muted-foreground))" },
    { label: awayLabel, key: "away", tone: "var(--chart-2)" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_64px] gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-1">
        <span>Outcome</span>
        <span className="text-right">Model</span>
      </div>
      {rows.map((r) => {
        const mo = model[r.key];
        return (
          <div key={r.key} className="grid grid-cols-[1fr_64px] items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: r.tone }} />
              <span className="text-sm truncate">{r.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-surface-1 overflow-hidden ml-2">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.round(mo * 100)}%`, background: r.tone, opacity: 0.85 }}
                />
              </div>
            </div>
            <span className="text-right font-mono text-sm tabular-nums">
              {(mo * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
      <p className="text-[11px] italic text-muted-foreground mt-2">
        Model-only — no published market for this fixture.
      </p>
    </div>
  );
}
