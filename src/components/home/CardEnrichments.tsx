import type { CardEnrichment, CardPair, CardProb, TeamForm } from "@/lib/home-enrichments.functions";

// ─────────────────────────────────────────────────────────────────────────────
// 1X2 probability bar
// ─────────────────────────────────────────────────────────────────────────────

export function ProbBar({ prob }: { prob: CardProb }) {
  const total = prob.home + prob.draw + prob.away || 1;
  const h = (prob.home / total) * 100;
  const d = (prob.draw / total) * 100;
  const a = (prob.away / total) * 100;
  const pct = (n: number) => Math.round(n * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
        <span>Model 1X2</span>
        <span className="font-mono text-foreground/80 tabular-nums">
          {pct(prob.home / total)}% · {pct(prob.draw / total)}% · {pct(prob.away / total)}%
        </span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="bg-chart-1/90" style={{ width: `${h}%` }} />
        <div className="bg-muted-foreground/40" style={{ width: `${d}%` }} />
        <div className="bg-chart-2/90" style={{ width: `${a}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Diverging pair bar (home vs away). Anchored center, scaled to max.
// ─────────────────────────────────────────────────────────────────────────────

export function PairBar({
  label,
  pair,
  fmt = "dec1",
  scaleMax,
  accent = "primary",
}: {
  label: string;
  pair: CardPair;
  fmt?: "dec1" | "int" | "pct";
  scaleMax?: number;
  accent?: "primary" | "live";
}) {
  const max = scaleMax ?? Math.max(pair.home, pair.away, 1);
  const hPct = Math.min(100, (pair.home / max) * 100);
  const aPct = Math.min(100, (pair.away / max) * 100);
  const fmtV = (v: number) =>
    fmt === "dec1" ? v.toFixed(1) : fmt === "pct" ? `${Math.round(v)}%` : String(Math.round(v));
  const homeColor = accent === "live" ? "bg-live/80" : "bg-chart-1/80";
  const awayColor = "bg-chart-2/80";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground/90">{fmtV(pair.home)}</span>
        <span>{label}</span>
        <span className="font-mono tabular-nums text-foreground/90">{fmtV(pair.away)}</span>
      </div>
      <div className="grid grid-cols-2 gap-px h-1 bg-surface-2/60 rounded-sm overflow-hidden">
        <div className="flex justify-end">
          <div className={`${homeColor} h-full`} style={{ width: `${hPct}%` }} />
        </div>
        <div className="flex justify-start">
          <div className={`${awayColor} h-full`} style={{ width: `${aPct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form pills (last 5 results — newest right)
// ─────────────────────────────────────────────────────────────────────────────

export function FormPills({ form, rank }: { form?: string; rank?: number }) {
  if (!form && rank == null) return null;
  const trimmed = (form ?? "").replace(/[^WDLwdl]/g, "").toUpperCase().slice(-5);
  return (
    <span className="inline-flex items-center gap-1">
      {rank != null && (
        <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
          #{rank}
        </span>
      )}
      {trimmed && (
        <span className="inline-flex gap-[2px]">
          {trimmed.split("").map((c, i) => {
            const cls =
              c === "W"
                ? "bg-emerald-500/80"
                : c === "D"
                  ? "bg-muted-foreground/60"
                  : "bg-rose-500/80";
            return (
              <span
                key={i}
                title={c}
                className={`inline-block h-1.5 w-1.5 rounded-[1px] ${cls}`}
              />
            );
          })}
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Momentum indicator (-1..1 → arrow + magnitude)
// ─────────────────────────────────────────────────────────────────────────────

export function MomentumChip({ momentum }: { momentum: number }) {
  const mag = Math.min(1, Math.abs(momentum));
  const towardHome = momentum > 0.05;
  const towardAway = momentum < -0.05;
  const label = towardHome ? "home pressing" : towardAway ? "away pressing" : "balanced";
  const arrow = towardHome ? "◀" : towardAway ? "▶" : "•";
  const color = towardHome
    ? "text-chart-1"
    : towardAway
      ? "text-chart-2"
      : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] ${color}`}>
      <span className="font-mono leading-none" style={{ opacity: 0.3 + 0.7 * mag }}>
        {arrow}
      </span>
      {label}
    </span>
  );
}

// xG overperformance chip (recent matches): goals − xG
export function XgEdgeChip({ goals, xg, side }: { goals: number; xg: number; side: "home" | "away" }) {
  const delta = goals - xg;
  if (Math.abs(delta) < 0.15) return null;
  const over = delta > 0;
  const cls = over ? "text-emerald-400 border-emerald-400/30" : "text-amber-400 border-amber-400/30";
  return (
    <span
      className={`inline-flex items-center rounded border px-1 text-[9px] uppercase tracking-[0.16em] font-mono tabular-nums ${cls}`}
      title={`${side} ${over ? "overperformed" : "underperformed"} xG`}
    >
      {over ? "+" : ""}
      {delta.toFixed(1)}
    </span>
  );
}

export type { CardEnrichment, TeamForm };
