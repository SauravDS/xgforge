// Goalkeeper workload — derived from on-target/goal incidents.

import type { GkWorkload } from "@/lib/live-derive";

export function GkWorkloadCard({
  workload,
  homeLabel,
  awayLabel,
}: {
  workload: GkWorkload;
  homeLabel: string;
  awayLabel: string;
}) {
  const anySignal =
    workload.home.shotsFaced + workload.away.shotsFaced + workload.home.goalsConceded + workload.away.goalsConceded > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Goalkeeper workload</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {anySignal ? "live" : "awaiting"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Col label={homeLabel} side="home" gk={workload.home} />
        <Col label={awayLabel} side="away" gk={workload.away} />
      </div>
    </div>
  );
}

function Col({
  label,
  side,
  gk,
}: {
  label: string;
  side: "home" | "away";
  gk: GkWorkload["home"];
}) {
  const color = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  const savePct = gk.shotsFaced > 0 ? (gk.saves / gk.shotsFaced) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs truncate" style={{ color }}>{label}</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          {gk.name ?? "GK"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat n={gk.shotsFaced} l="faced" />
        <Stat n={gk.saves} l="saves" />
        <Stat n={gk.goalsConceded} l="conceded" tone={gk.goalsConceded > 0 ? "text-rose-300" : undefined} />
      </div>
      {gk.shotsFaced > 0 && (
        <div className="h-1 rounded-full bg-surface-1 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${savePct}%`, background: color, opacity: 0.8 }} />
        </div>
      )}
    </div>
  );
}

function Stat({ n, l, tone }: { n: number; l: string; tone?: string }) {
  return (
    <div className="rounded border border-border/40 bg-surface-1/40 px-1.5 py-1">
      <div className={`font-mono text-base tabular-nums ${tone ?? ""}`}>{n}</div>
      <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{l}</div>
    </div>
  );
}
