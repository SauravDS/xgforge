// Graphical match timeline — horizontal axis 0–max(90, currentMinute),
// home above the axis, away below, neutral events on the axis.
// All icons are inline SVG, theme-colored, with native hover tooltips.

import { useMemo } from "react";

import type { TimelineEvent } from "@/lib/match-derive";

export type TimelineExtras = {
  homeTeam: string;
  awayTeam: string;
  liveMinute?: number | null;
  isLive?: boolean;
};

export function MatchTimeline({
  events,
  homeTeam,
  awayTeam,
  liveMinute,
  isLive,
}: { events: TimelineEvent[] } & TimelineExtras) {
  const maxMin = useMemo(() => {
    const m = Math.max(90, liveMinute ?? 0, ...events.map((e) => e.minute));
    return Math.ceil(m / 5) * 5;
  }, [events, liveMinute]);

  // Compute running score for goal events (chronological)
  const enriched = useMemo(() => {
    const sorted = events.slice().sort((a, b) => a.minute - b.minute);
    let h = 0,
      a = 0;
    return sorted.map((ev) => {
      let score: { home: number; away: number } | undefined;
      if (ev.kind === "goal" || ev.kind === "penalty_goal") {
        if (ev.team === "home") h++;
        else if (ev.team === "away") a++;
        score = { home: h, away: a };
      } else if (ev.kind === "own_goal") {
        if (ev.team === "home") a++;
        else if (ev.team === "away") h++;
        score = { home: h, away: a };
      }
      return { ...ev, score };
    });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Match incidents will appear here as they happen.
      </div>
    );
  }

  const W = 1000;
  const H = 168;
  const axisY = H / 2;
  const x = (m: number) => (m / maxMin) * W;

  // Period markers and ticks
  const ticks = [0, 15, 30, 45, 60, 75, 90].filter((t) => t <= maxMin);

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" preserveAspectRatio="none" style={{ height: H }}>
          {/* Vertical grid */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={8}
                y2={H - 8}
                stroke="hsl(var(--border) / 0.45)"
                strokeWidth={0.5}
                strokeDasharray={t === 45 ? "3 3" : undefined}
              />
              <text
                x={x(t)}
                y={H - 1}
                textAnchor="middle"
                fontSize={9}
                className="fill-muted-foreground"
                style={{ fontFamily: "ui-monospace,monospace" }}
              >
                {t}'
              </text>
            </g>
          ))}

          {/* Axis */}
          <line x1={0} x2={W} y1={axisY} y2={axisY} stroke="hsl(var(--border) / 0.8)" strokeWidth={1} />

          {/* Lane labels */}
          <text x={4} y={18} fontSize={10} className="fill-chart-1" style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>{homeTeam.slice(0, 18)}</text>
          <text x={4} y={H - 16} fontSize={10} className="fill-chart-2" style={{ letterSpacing: 1.4, textTransform: "uppercase" }}>{awayTeam.slice(0, 18)}</text>

          {/* Now cursor */}
          {isLive && typeof liveMinute === "number" && liveMinute > 0 && (
            <g>
              <line x1={x(liveMinute)} x2={x(liveMinute)} y1={8} y2={H - 8} stroke="var(--live, hsl(var(--destructive)))" strokeWidth={1.5} />
              <circle cx={x(liveMinute)} cy={axisY} r={4} fill="var(--live, hsl(var(--destructive)))">
                <animate attributeName="r" values="4;6;4" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </g>
          )}

          {/* Events */}
          {enriched.map((ev, i) => {
            const cx = x(ev.minute);
            if (ev.kind === "period") {
              return (
                <g key={i}>
                  <line x1={cx} x2={cx} y1={4} y2={H - 4} stroke="hsl(var(--border) / 0.9)" strokeDasharray="2 3" strokeWidth={1} />
                  <rect x={cx - 22} y={axisY - 7} width={44} height={14} rx={3} fill="hsl(var(--background))" stroke="hsl(var(--border))" />
                  <text x={cx} y={axisY + 3} textAnchor="middle" fontSize={8} className="fill-muted-foreground" style={{ letterSpacing: 1, textTransform: "uppercase" }}>
                    {ev.label.slice(0, 8)}
                  </text>
                </g>
              );
            }
            const lane = ev.team === "home" ? "top" : ev.team === "away" ? "bottom" : "axis";
            const cy = lane === "top" ? axisY - 32 : lane === "bottom" ? axisY + 32 : axisY;
            const stem = lane === "top" ? `M${cx},${axisY} L${cx},${cy + 8}` : lane === "bottom" ? `M${cx},${axisY} L${cx},${cy - 8}` : "";
            const tooltipParts: string[] = [`${ev.minute}'`, ev.label];
            if (ev.player) tooltipParts.push(ev.player);
            if (ev.playerIn) tooltipParts.push(`↑ ${ev.playerIn}`);
            if (ev.playerOut) tooltipParts.push(`↓ ${ev.playerOut}`);
            if (ev.assist) tooltipParts.push(`assist ${ev.assist}`);
            const tooltip = tooltipParts.join(" · ");
            return (
              <g key={i}>
                {stem && <path d={stem} stroke="hsl(var(--border) / 0.6)" strokeWidth={0.75} />}
                <EventGlyph ev={ev} cx={cx} cy={cy} side={lane === "top" ? "home" : lane === "bottom" ? "away" : "neutral"} />
                <title>{tooltip}</title>
                {ev.score && (
                  <g>
                    <rect
                      x={cx - 14}
                      y={lane === "top" ? cy - 26 : cy + 12}
                      width={28}
                      height={13}
                      rx={2}
                      fill="hsl(var(--background))"
                      stroke="hsl(var(--border))"
                    />
                    <text
                      x={cx}
                      y={lane === "top" ? cy - 16 : cy + 22}
                      textAnchor="middle"
                      fontSize={9}
                      className="fill-foreground"
                      style={{ fontFamily: "ui-monospace,monospace" }}
                    >
                      {ev.score.home}-{ev.score.away}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Key moments filmstrip */}
      <KeyMomentsStrip events={enriched} />
    </div>
  );
}

function KeyMomentsStrip({
  events,
}: {
  events: (TimelineEvent & { score?: { home: number; away: number } })[];
}) {
  const goals = events.filter((e) => e.kind === "goal" || e.kind === "penalty_goal" || e.kind === "own_goal");
  if (!goals.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-1">Key moments</span>
      {goals.map((g, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-1/60 px-2.5 py-0.5 text-[11px]"
          style={{ color: g.team === "home" ? "var(--chart-1)" : "var(--chart-2)" }}
        >
          <span className="font-mono tabular-nums opacity-75">{g.minute}'</span>
          <span className="font-semibold">⚽</span>
          <span className="text-foreground truncate max-w-[120px]">{g.player ?? g.label}</span>
          {g.score && (
            <span className="font-mono tabular-nums text-muted-foreground">{g.score.home}-{g.score.away}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function EventGlyph({
  ev,
  cx,
  cy,
  side,
}: {
  ev: TimelineEvent;
  cx: number;
  cy: number;
  side: "home" | "away" | "neutral";
}) {
  const color = side === "home" ? "var(--chart-1)" : side === "away" ? "var(--chart-2)" : "hsl(var(--muted-foreground))";
  switch (ev.kind) {
    case "goal":
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill={color} />
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={10} className="fill-background" style={{ fontWeight: 700 }}>⚽</text>
        </g>
      );
    case "penalty_goal":
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill={color} />
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={8} className="fill-background" style={{ fontWeight: 700 }}>P</text>
        </g>
      );
    case "own_goal":
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.6} />
          <text x={cx} y={cy + 3} textAnchor="middle" fontSize={7} className="fill-background" style={{ fontWeight: 700 }}>OG</text>
        </g>
      );
    case "missed_penalty":
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="none" stroke={color} strokeWidth={1.5} />
          <line x1={cx - 5} x2={cx + 5} y1={cy - 5} y2={cy + 5} stroke={color} strokeWidth={1.5} />
        </g>
      );
    case "card_yellow":
      return <rect x={cx - 3} y={cy - 6} width={6} height={11} fill="#facc15" rx={1} />;
    case "card_red":
      return <rect x={cx - 3} y={cy - 6} width={6} height={11} fill="#ef4444" rx={1} />;
    case "card_second_yellow":
      return (
        <g>
          <rect x={cx - 4} y={cy - 7} width={6} height={11} fill="#facc15" rx={1} />
          <rect x={cx - 1} y={cy - 4} width={6} height={11} fill="#ef4444" rx={1} />
        </g>
      );
    case "substitution":
      return (
        <g>
          <line x1={cx - 3} x2={cx - 3} y1={cy - 6} y2={cy + 6} stroke="#10b981" strokeWidth={1.5} />
          <polygon points={`${cx - 5},${cy - 3} ${cx - 1},${cy - 3} ${cx - 3},${cy - 7}`} fill="#10b981" />
          <line x1={cx + 3} x2={cx + 3} y1={cy - 6} y2={cy + 6} stroke="#f43f5e" strokeWidth={1.5} />
          <polygon points={`${cx + 1},${cy + 3} ${cx + 5},${cy + 3} ${cx + 3},${cy + 7}`} fill="#f43f5e" />
        </g>
      );
    case "var":
      return (
        <g>
          <circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={1.2} />
          <line x1={cx + 3} x2={cx + 6} y1={cy + 3} y2={cy + 6} stroke={color} strokeWidth={1.5} />
        </g>
      );
    case "injury":
      return (
        <g>
          <line x1={cx} x2={cx} y1={cy - 5} y2={cy + 5} stroke={color} strokeWidth={1.6} />
          <line x1={cx - 5} x2={cx + 5} y1={cy} y2={cy} stroke={color} strokeWidth={1.6} />
        </g>
      );
    case "corner":
      return <path d={`M${cx - 5},${cy + 5} A8,8 0 0 1 ${cx + 5},${cy + 5}`} fill="none" stroke={color} strokeWidth={1.4} />;
    default:
      return <circle cx={cx} cy={cy} r={3} fill={color} />;
  }
}
