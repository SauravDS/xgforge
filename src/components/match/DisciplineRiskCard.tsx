// Discipline & risk meter — yellows, reds, recent fouls per team
// plus a derived red-card risk index. Also surfaces the referee context.

import type { BsdRefereeInfo } from "@/lib/bsd-types";
import type { DisciplineRisk } from "@/lib/live-derive";

export function DisciplineRiskCard({
  risk,
  homeLabel,
  awayLabel,
  referee,
}: {
  risk: DisciplineRisk;
  homeLabel: string;
  awayLabel: string;
  referee?: BsdRefereeInfo | null;
}) {
  const max = Math.max(1, risk.home.risk, risk.away.risk);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Discipline &amp; risk</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          live index
        </span>
      </div>
      {referee && (
        <div className="mb-3 flex items-center flex-wrap gap-x-2 gap-y-1 rounded border border-border/40 bg-surface-1/40 px-2.5 py-1.5 text-[11px]">
          <span className="text-muted-foreground">🟨</span>
          <span className="font-medium">{referee.name}</span>
          {referee.country && (
            <span className="text-muted-foreground">· {referee.country}</span>
          )}
          {typeof referee.avg_yellow_per_match === "number" && (
            <span className="font-mono tabular-nums text-muted-foreground">
              ⌀ <span className="text-yellow-300">{referee.avg_yellow_per_match.toFixed(2)}</span> YC/m
            </span>
          )}
          {typeof referee.avg_red_per_match === "number" && referee.avg_red_per_match > 0 && (
            <span className="font-mono tabular-nums text-muted-foreground">
              · <span className="text-rose-400">{referee.avg_red_per_match.toFixed(2)}</span> RC/m
            </span>
          )}
          {typeof referee.avg_fouls_per_match === "number" && (
            <span className="font-mono tabular-nums text-muted-foreground">
              · {referee.avg_fouls_per_match.toFixed(1)} fouls/m
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <RiskCol label={homeLabel} side="home" data={risk.home} max={max} />
        <RiskCol label={awayLabel} side="away" data={risk.away} max={max} />
      </div>
    </div>
  );
}


function RiskCol({
  label,
  side,
  data,
  max,
}: {
  label: string;
  side: "home" | "away";
  data: DisciplineRisk["home"];
  max: number;
}) {
  const color = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  const pct = Math.min(100, (data.risk / max) * 100);
  const tone =
    data.risk >= 4
      ? "text-rose-300"
      : data.risk >= 2
        ? "text-yellow-300"
        : "text-emerald-300";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs truncate" style={{ color }}>{label}</span>
        <span className={`font-mono text-sm tabular-nums ${tone}`}>{data.risk.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-surface-1 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-2 rounded-[1px] bg-yellow-400" /> {data.yellows}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-2 rounded-[1px] bg-rose-500" /> {data.reds}
        </span>
        <span className="text-muted-foreground">·</span>
        <span>fouls 15' <span className="text-foreground">{data.foulsLate}</span></span>
      </div>
    </div>
  );
}
