// LivePitchMap — derived live pitch graphic. No tracking endpoint exists,
// so the panel renders shots from `stats.shotmap`, optional average player
// positions from `stats.average_positions`, and a pressure-arrow built from
// the recent momentum window.

import { useMemo } from "react";

import {
  parseShotmap,
  parseAveragePositions,
  parseMomentumSeries,
  recentMomentum,
  type ShotmapShot,
} from "@/lib/match-stats";

const W = 108;
const H = 68;

export function LivePitchMap({
  statistics,
  homeLabel,
  awayLabel,
  liveMinute,
}: {
  statistics: unknown;
  homeLabel: string;
  awayLabel: string;
  liveMinute: number;
}) {
  const shots = useMemo(() => parseShotmap(statistics), [statistics]);
  const positions = useMemo(() => parseAveragePositions(statistics), [statistics]);
  const momentumSeries = useMemo(() => parseMomentumSeries(statistics), [statistics]);
  const mAvg = useMemo(
    () => (liveMinute > 0 ? recentMomentum(momentumSeries, liveMinute, 5) : 0),
    [momentumSeries, liveMinute],
  );

  // Home attacks left→right; away attacks right→left. We mirror away shots
  // about the centre line so they appear in the home defensive third.
  const placeShot = (s: ShotmapShot): { x: number; y: number } => {
    const px = Math.max(0, Math.min(100, s.posX));
    const py = Math.max(0, Math.min(100, s.posY));
    // posX is distance from attacking goal (0..100), so home shoots toward x=W
    const x = s.home ? (W * px) / 100 : W - (W * px) / 100;
    const y = (H * py) / 100;
    return { x, y };
  };

  const homeShots = shots.filter((s) => s.home);
  const awayShots = shots.filter((s) => !s.home);
  const homeGoals = homeShots.filter((s) => s.type === "goal").length;
  const awayGoals = awayShots.filter((s) => s.type === "goal").length;
  const homeXg = homeShots.reduce((a, s) => a + s.xg, 0);
  const awayXg = awayShots.reduce((a, s) => a + s.xg, 0);

  // pressure arrow
  const arrow = (() => {
    if (Math.abs(mAvg) < 4) return null;
    const mag = Math.min(1, Math.abs(mAvg) / 60);
    const len = 8 + 22 * mag;
    const cy = H / 2;
    const cx = W / 2;
    const dir = mAvg > 0 ? 1 : -1; // home pressing right, away pressing left
    return { x1: cx - (dir * len) / 2, x2: cx + (dir * len) / 2, y: cy, mag };
  })();

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-semibold tracking-tight">
          Pitch map
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground ml-2">
            derived · shots · pressure
          </span>
        </h3>
        <div className="text-[10px] font-mono tabular-nums text-muted-foreground">
          <span className="text-chart-1">
            {homeLabel.slice(0, 14)} {homeGoals}g · {homeXg.toFixed(2)} xG · {homeShots.length} sh
          </span>
          <span className="px-1.5">·</span>
          <span className="text-chart-2">
            {awayLabel.slice(0, 14)} {awayGoals}g · {awayXg.toFixed(2)} xG · {awayShots.length} sh
          </span>
        </div>
      </div>

      <div className="relative w-full">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-md" preserveAspectRatio="xMidYMid meet">
          {/* pitch background */}
          <rect x={0} y={0} width={W} height={H} fill="hsl(var(--muted) / 0.18)" />
          {/* stripes */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={i}
              x={(W / 6) * i}
              y={0}
              width={W / 6}
              height={H}
              fill={i % 2 === 0 ? "hsl(var(--muted) / 0.08)" : "transparent"}
            />
          ))}
          {/* outer */}
          <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          {/* halfway */}
          <line x1={W / 2} y1={0.5} x2={W / 2} y2={H - 0.5} stroke="hsl(var(--border))" strokeWidth={0.4} />
          <circle cx={W / 2} cy={H / 2} r={6} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          <circle cx={W / 2} cy={H / 2} r={0.6} fill="hsl(var(--border))" />
          {/* penalty boxes */}
          <rect x={0} y={H / 2 - 12} width={11} height={24} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          <rect x={W - 11} y={H / 2 - 12} width={11} height={24} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          <rect x={0} y={H / 2 - 5} width={4} height={10} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          <rect x={W - 4} y={H / 2 - 5} width={4} height={10} fill="none" stroke="hsl(var(--border))" strokeWidth={0.4} />
          {/* goals */}
          <rect x={-1} y={H / 2 - 3} width={1} height={6} fill="hsl(var(--border))" />
          <rect x={W} y={H / 2 - 3} width={1} height={6} fill="hsl(var(--border))" />
          {/* spot dots */}
          <circle cx={7} cy={H / 2} r={0.5} fill="hsl(var(--border))" />
          <circle cx={W - 7} cy={H / 2} r={0.5} fill="hsl(var(--border))" />

          {/* pressure arrow */}
          {arrow && (
            <g opacity={0.6 + 0.4 * arrow.mag}>
              <defs>
                <marker
                  id="pressureHead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="3"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill={mAvg > 0 ? "var(--chart-1)" : "var(--chart-2)"} />
                </marker>
              </defs>
              <line
                x1={arrow.x1}
                y1={arrow.y}
                x2={arrow.x2}
                y2={arrow.y}
                stroke={mAvg > 0 ? "var(--chart-1)" : "var(--chart-2)"}
                strokeWidth={1.1}
                strokeLinecap="round"
                markerEnd="url(#pressureHead)"
              />
            </g>
          )}

          {/* average positions */}
          {positions.map((p) => {
            const x = p.team === "home" ? (W * p.x) / 100 : W - (W * p.x) / 100;
            const y = (H * p.y) / 100;
            return (
              <g key={`pos-${p.team}-${p.playerId}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={1.6}
                  fill={p.team === "home" ? "var(--chart-1)" : "var(--chart-2)"}
                  fillOpacity={0.85}
                  stroke="hsl(var(--background))"
                  strokeWidth={0.3}
                />
                {p.jersey != null && (
                  <text
                    x={x}
                    y={y + 0.6}
                    textAnchor="middle"
                    fontSize={1.6}
                    fill="hsl(var(--background))"
                  >
                    {p.jersey}
                  </text>
                )}
              </g>
            );
          })}

          {/* shots */}
          {shots.map((s, i) => {
            const { x, y } = placeShot(s);
            const r = Math.max(0.7, Math.min(3.4, 0.8 + 14 * s.xg) / 2);
            const color = s.home ? "var(--chart-1)" : "var(--chart-2)";
            const goal = s.type === "goal";
            const miss = s.type === "miss" || s.type === "off-target";
            const block = s.type === "block" || s.type === "blocked";
            return (
              <g key={`shot-${i}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={goal ? color : "transparent"}
                  stroke={color}
                  strokeWidth={0.5}
                  strokeDasharray={miss ? "1.2 1" : block ? "0.8 0.6" : undefined}
                  opacity={goal ? 1 : 0.85}
                >
                  <title>{`${s.minute}'  xG ${s.xg.toFixed(2)} · ${s.type}${s.body ? " · " + s.body : ""}${s.situation ? " · " + s.situation : ""}`}</title>
                </circle>
                {goal && (
                  <text x={x} y={y - r - 0.6} textAnchor="middle" fontSize={2.2} fill="hsl(var(--foreground))">
                    ⚽
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-4 text-[10px] uppercase tracking-[0.16em] text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-chart-1" /> {homeLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-chart-2" /> {awayLabel}
        </span>
        <span className="normal-case tracking-normal text-[10px]">
          ● goal · ○ shot · radius = xG · dashed = miss/block
        </span>
        {Math.abs(mAvg) >= 4 && (
          <span className="ml-auto normal-case tracking-normal text-[10px]">
            Pressure ({liveMinute - 5}'–{liveMinute}') →{" "}
            <span className={mAvg > 0 ? "text-chart-1" : "text-chart-2"}>
              {mAvg > 0 ? homeLabel : awayLabel}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
