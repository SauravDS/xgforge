// Stacked-area live win-probability curve (H/D/A) with optional swing list.

import { useMemo } from "react";

import type { WinProbPoint, WpSwing } from "@/lib/live-derive";

export function WinProbabilityLive({
  points,
  homeLabel,
  awayLabel,
  swings,
  height = 200,
}: {
  points: WinProbPoint[];
  homeLabel: string;
  awayLabel: string;
  swings?: WpSwing[];
  height?: number;
}) {
  const { paths, last, width } = useMemo(() => {
    const W = 800;
    const H = height;
    if (points.length === 0)
      return { paths: { home: "", draw: "", away: "" }, last: null as WinProbPoint | null, width: W };
    const maxMin = Math.max(90, points[points.length - 1].minute);
    const x = (m: number) => (m / maxMin) * W;
    const y = (p: number) => H - p * H;

    const homeArea =
      points
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(p.home).toFixed(1)}`)
        .join(" ") +
      ` L${x(points[points.length - 1].minute).toFixed(1)},${H} L${x(points[0].minute).toFixed(1)},${H} Z`;
    const drawArea =
      points
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(p.home + p.draw).toFixed(1)}`,
        )
        .join(" ") +
      " " +
      points
        .slice()
        .reverse()
        .map((p) => `L${x(p.minute).toFixed(1)},${y(p.home).toFixed(1)}`)
        .join(" ") +
      " Z";
    const awayArea =
      points
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(1).toFixed(1)}`)
        .join(" ") +
      " " +
      points
        .slice()
        .reverse()
        .map((p) => `L${x(p.minute).toFixed(1)},${y(p.home + p.draw).toFixed(1)}`)
        .join(" ") +
      " Z";
    return {
      paths: { home: homeArea, draw: drawArea, away: awayArea },
      last: points[points.length - 1],
      width: W,
    };
  }, [points, height]);

  if (!points.length || !last) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Win-probability curve appears once the match is under way.
      </div>
    );
  }
  const maxMin = Math.max(90, last.minute);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
      <div>
        <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
          <h3 className="text-sm font-semibold tracking-tight">Win probability</h3>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono">
            <span className="text-chart-1">{(last.home * 100).toFixed(0)}%</span>
            <span className="px-1.5 text-muted-foreground">·</span>
            <span>{(last.draw * 100).toFixed(0)}%</span>
            <span className="px-1.5 text-muted-foreground">·</span>
            <span className="text-chart-2">{(last.away * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
            <defs>
              <linearGradient id="wpHome" x1="0" x2="0" y1="1" y2="0">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="wpAway" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <path d={paths.home} fill="url(#wpHome)" />
            <path d={paths.draw} fill="hsl(var(--muted) / 0.45)" />
            <path d={paths.away} fill="url(#wpAway)" />
            {[15, 30, 45, 60, 75, 90].map((m) => (
              <line
                key={m}
                x1={(m / maxMin) * width}
                x2={(m / maxMin) * width}
                y1={0}
                y2={height}
                stroke="hsl(var(--border) / 0.5)"
                strokeWidth={0.5}
                strokeDasharray={m === 45 ? "3 3" : undefined}
              />
            ))}
            {/* swing markers */}
            {swings?.map((s, i) => (
              <line
                key={i}
                x1={(s.minute / maxMin) * width}
                x2={(s.minute / maxMin) * width}
                y1={0}
                y2={height}
                stroke={s.delta >= 0 ? "var(--chart-1)" : "var(--chart-2)"}
                strokeOpacity={0.5}
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ))}
            <line
              x1={(last.minute / maxMin) * width}
              x2={(last.minute / maxMin) * width}
              y1={0}
              y2={height}
              stroke="var(--live, hsl(var(--destructive)))"
              strokeWidth={1.5}
            />
            <circle
              cx={(last.minute / maxMin) * width}
              cy={height - last.home * height}
              r={3.5}
              fill="var(--chart-1)"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
            />
          </svg>
          <div className="flex justify-between text-[9px] font-mono tabular-nums text-muted-foreground mt-1">
            <span>0'</span>
            <span>HT</span>
            <span>90'</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-chart-1" /> {homeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-muted" /> Draw
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm bg-chart-2" /> {awayLabel}
          </span>
        </div>
      </div>

      <SwingList swings={swings ?? []} />
    </div>
  );
}

function SwingList({ swings }: { swings: WpSwing[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Biggest swings
      </h4>
      {swings.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No major swings yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {swings.map((s, i) => {
            const tone = s.delta >= 0 ? "text-chart-1" : "text-chart-2";
            const sign = s.delta >= 0 ? "+" : "−";
            return (
              <li key={i} className="text-[11px] leading-tight">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-muted-foreground tabular-nums">{s.minute}'</span>
                  <span className={`font-mono tabular-nums ${tone}`}>{sign}{(Math.abs(s.delta) * 100).toFixed(0)}%</span>
                </div>
                <div className="text-muted-foreground truncate">{s.label}</div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
