// Territory & Tempo — overlaid hex/heptagon radar of style indicators.

import type { LiveStatsBundle } from "@/lib/match-stats";

const AXES = [
  { key: "touchesInPenaltyArea", label: "Box touches", max: 30 },
  { key: "finalThirdEntries", label: "Final third", max: 80 },
  { key: "crossesPct", label: "Cross %", max: 100 },
  { key: "dribblesPct", label: "Dribble %", max: 100 },
  { key: "longBallsPct", label: "Long ball %", max: 100 },
  { key: "aerialDuelsPct", label: "Aerial %", max: 100 },
] as const;

function readSide(s: LiveStatsBundle["home"]) {
  return {
    touchesInPenaltyArea: s.touchesInPenaltyArea,
    finalThirdEntries: s.finalThirdEntries,
    crossesPct: s.crosses.pct,
    dribblesPct: s.dribbles.pct,
    longBallsPct: s.longBalls.pct,
    aerialDuelsPct: s.aerialDuels.pct,
  };
}

export function TerritoryTempoCard({
  stats,
  homeLabel,
  awayLabel,
}: {
  stats: LiveStatsBundle;
  homeLabel: string;
  awayLabel: string;
}) {
  const cx = 110;
  const cy = 110;
  const R = 88;
  const n = AXES.length;

  const home = readSide(stats.home);
  const away = readSide(stats.away);

  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  const ring = (frac: number) =>
    AXES.map((_, i) => pt(i, R * frac).join(",")).join(" ");

  const polygon = (vals: Record<string, number>) =>
    AXES.map((ax, i) => {
      const v = Math.max(0, Math.min(1, (vals[ax.key] ?? 0) / ax.max));
      return pt(i, R * v).join(",");
    }).join(" ");

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Territory &amp; tempo</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">style print</span>
      </div>
      <div className="flex items-center justify-center">
        <svg viewBox="0 0 220 220" className="w-full max-w-[280px]" aria-hidden>
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <polygon
              key={i}
              points={ring(f)}
              fill="none"
              stroke="hsl(var(--border) / 0.4)"
              strokeWidth={0.6}
            />
          ))}
          {AXES.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border) / 0.3)" strokeWidth={0.5} />;
          })}
          <polygon points={polygon(home)} fill="var(--chart-1)" fillOpacity={0.18} stroke="var(--chart-1)" strokeWidth={1.4} />
          <polygon points={polygon(away)} fill="var(--chart-2)" fillOpacity={0.18} stroke="var(--chart-2)" strokeWidth={1.4} />
          {AXES.map((ax, i) => {
            const [x, y] = pt(i, R + 14);
            return (
              <text key={ax.key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={8} className="fill-muted-foreground" style={{ letterSpacing: 0.6, textTransform: "uppercase" }}>
                {ax.label}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.16em]">
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-1" /> {homeLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-chart-2" /> {awayLabel}</span>
      </div>
    </div>
  );
}
