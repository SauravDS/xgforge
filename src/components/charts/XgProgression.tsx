import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveStepAfter } from "@visx/curve";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, Circle, Line, LinePath } from "@visx/shape";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { useMemo } from "react";

import type { ShotEvent } from "@/lib/match-derive";

export type XgPoint = { minute: number; home: number; away: number };

const margin = { top: 18, right: 16, bottom: 28, left: 36 };

type TipDatum =
  | { kind: "shot"; shot: ShotEvent }
  | { kind: "point"; minute: number; home: number; away: number };

export function XgProgression({
  points,
  shots = [],
  modelPath,
  goalDiffSeries,
  liveMinute,
  homeLabel = "Home",
  awayLabel = "Away",
  height = 220,
}: {
  points: XgPoint[];
  shots?: ShotEvent[];
  /** Optional model-derived expected path, drawn dashed when shot xG isn't streamed. */
  modelPath?: XgPoint[];
  /** Optional per-minute (home goals − away goals) series for ribbon below. */
  goalDiffSeries?: { minute: number; diff: number }[];
  /** Live-minute "now" guide; renders a red pulsing line. */
  liveMinute?: number | null;
  homeLabel?: string;
  awayLabel?: string;
  height?: number;
}) {
  const hasReal = points.length >= 2;
  const hasModel = !!(modelPath && modelPath.length >= 2);
  if (!hasReal && !hasModel) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        xG progression appears once the match has shot events.
      </div>
    );
  }
  const renderPoints: XgPoint[] = hasReal ? points : (modelPath as XgPoint[]);
  const renderMode: "real" | "model" = hasReal ? "real" : "model";
  return (
    <div className="space-y-1">
      <ParentSize>
        {({ width }) =>
          width > 0 ? (
            <Chart
              width={width}
              height={height}
              points={renderPoints}
              shots={shots}
              mode={renderMode}
              homeLabel={homeLabel}
              awayLabel={awayLabel}
              liveMinute={typeof liveMinute === "number" ? liveMinute : undefined}
            />
          ) : null
        }
      </ParentSize>
      {goalDiffSeries && goalDiffSeries.length > 2 && (
        <GoalDiffRibbon series={goalDiffSeries} />
      )}
    </div>
  );
}

function GoalDiffRibbon({
  series,
}: {
  series: { minute: number; diff: number }[];
}) {
  const W = 800;
  const H = 22;
  const maxMin = Math.max(90, series[series.length - 1].minute);
  const maxAbs = Math.max(1, ...series.map((p) => Math.abs(p.diff)));
  const x = (m: number) => (m / maxMin) * W;
  const mid = H / 2;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-mono mb-0.5">
        Goal difference
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }} aria-hidden>
        <line x1={0} x2={W} y1={mid} y2={mid} stroke="hsl(var(--border) / 0.7)" strokeWidth={0.5} />
        {series.map((p, i) => {
          if (p.diff === 0) return null;
          const h = (Math.abs(p.diff) / maxAbs) * (mid - 2);
          const positive = p.diff > 0;
          const w = Math.max(1, W / series.length);
          return (
            <rect
              key={i}
              x={x(p.minute) - w / 2}
              y={positive ? mid - h : mid}
              width={w}
              height={h}
              fill={positive ? "var(--chart-1)" : "var(--chart-2)"}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

function Chart({
  width,
  height,
  points,
  shots,
  mode,
  homeLabel,
  awayLabel,
  liveMinute,
}: {
  width: number;
  height: number;
  points: XgPoint[];
  shots: ShotEvent[];
  mode: "real" | "model";
  homeLabel: string;
  awayLabel: string;
  liveMinute?: number;
}) {
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const { maxMin, maxXg } = useMemo(() => {
    const last = points[points.length - 1];
    const m = Math.max(90, last.minute);
    const v = Math.max(
      0.5,
      ...points.map((p) => Math.max(p.home, p.away)),
      ...shots.map((s) => s.xg),
    );
    return { maxMin: m, maxXg: Math.ceil(v * 2) / 2 };
  }, [points, shots]);

  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, maxMin], range: [0, innerW] }),
    [maxMin, innerW],
  );
  const yScale = useMemo(
    () => scaleLinear<number>({ domain: [0, maxXg], range: [innerH, 0], nice: true }),
    [maxXg, innerH],
  );

  const goals = useMemo(() => shots.filter((s) => s.isGoal), [shots]);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip<TipDatum>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label="xG progression">
        <Group left={margin.left} top={margin.top}>
          <GridRows
            scale={yScale}
            width={innerW}
            stroke="var(--border)"
            strokeOpacity={0.4}
            strokeDasharray="2 4"
            numTicks={4}
          />

          {/* halftime marker */}
          <Line
            from={{ x: xScale(45), y: 0 }}
            to={{ x: xScale(45), y: innerH }}
            stroke="var(--border)"
            strokeOpacity={0.7}
          />
          <text
            x={xScale(45)}
            y={-4}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            style={{ fontSize: 8, letterSpacing: 1 }}
          >
            HT
          </text>

          {/* live "now" guide */}
          {typeof liveMinute === "number" && liveMinute > 0 && liveMinute <= maxMin && (
            <Line
              from={{ x: xScale(liveMinute), y: 0 }}
              to={{ x: xScale(liveMinute), y: innerH }}
              stroke="var(--live, hsl(var(--destructive)))"
              strokeWidth={1.5}
            />
          )}

          {/* goal vertical guides */}
          {goals.map((g, i) => (
            <Line
              key={`gv-${i}`}
              from={{ x: xScale(g.minute), y: 0 }}
              to={{ x: xScale(g.minute), y: innerH }}
              stroke={g.team === "home" ? "var(--chart-1)" : "var(--chart-2)"}
              strokeOpacity={0.18}
              strokeWidth={1}
            />
          ))}

          {/* area + step line home */}
          <AreaClosed<XgPoint>
            data={points}
            x={(d) => xScale(d.minute)}
            y={(d) => yScale(d.home)}
            yScale={yScale}
            curve={curveStepAfter}
            fill="var(--chart-1)"
            fillOpacity={0.12}
          />
          <LinePath<XgPoint>
            data={points}
            x={(d) => xScale(d.minute)}
            y={(d) => yScale(d.home)}
            curve={curveStepAfter}
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeDasharray={mode === "model" ? "5 4" : undefined}
            strokeOpacity={mode === "model" ? 0.75 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* area + step line away */}
          <AreaClosed<XgPoint>
            data={points}
            x={(d) => xScale(d.minute)}
            y={(d) => yScale(d.away)}
            yScale={yScale}
            curve={curveStepAfter}
            fill="var(--chart-2)"
            fillOpacity={0.12}
          />
          <LinePath<XgPoint>
            data={points}
            x={(d) => xScale(d.minute)}
            y={(d) => yScale(d.away)}
            curve={curveStepAfter}
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray={mode === "model" ? "5 4" : undefined}
            strokeOpacity={mode === "model" ? 0.75 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* shot dots sized by xG */}
          {shots.map((s, i) => {
            const cx = xScale(s.minute);
            const cy = yScale(s.team === "home" ? sumUntil(points, s.minute, "home") : sumUntil(points, s.minute, "away"));
            const r = Math.max(2, Math.min(9, 2 + s.xg * 10));
            const color = s.team === "home" ? "var(--chart-1)" : "var(--chart-2)";
            return (
              <Circle
                key={`shot-${i}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={s.isGoal ? color : "transparent"}
                stroke={color}
                strokeWidth={s.isGoal ? 0 : 1.5}
                fillOpacity={s.isGoal ? 0.9 : 1}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  showTooltip({
                    tooltipData: { kind: "shot", shot: s },
                    tooltipLeft: rect.left + rect.width / 2,
                    tooltipTop: rect.top,
                  });
                }}
                onMouseLeave={hideTooltip}
                style={{ cursor: "pointer" }}
              />
            );
          })}

          {/* goal stars */}
          {goals.map((g, i) => {
            const cy = yScale(g.team === "home" ? sumUntil(points, g.minute, "home") : sumUntil(points, g.minute, "away"));
            return (
              <text
                key={`goal-${i}`}
                x={xScale(g.minute)}
                y={cy - 12}
                textAnchor="middle"
                className="fill-foreground font-mono"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                ⚽
              </text>
            );
          })}

          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickLabelProps={() => ({
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 9,
              textAnchor: "end",
              dx: -4,
              dy: 3,
            })}
            tickFormat={(v) => (typeof v === "number" ? v.toFixed(1) : String(v))}
            label="xG"
            labelProps={{
              fill: "var(--muted-foreground)",
              fontSize: 9,
              fontFamily: "var(--font-mono, ui-monospace)",
              textAnchor: "middle",
              dx: -22,
              dy: innerH / 2 + 10,
            }}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={[0, 15, 30, 45, 60, 75, 90].filter((t) => t <= maxMin)}
            stroke="var(--border)"
            tickStroke="var(--border)"
            tickFormat={(v) => `${v}'`}
            tickLabelProps={() => ({
              fill: "var(--muted-foreground)",
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 9,
              textAnchor: "middle",
              dy: 4,
            })}
          />
        </Group>

        {/* legend */}
        <g transform={`translate(${margin.left} 8)`}>
          <circle cx={4} cy={4} r={3} fill="var(--chart-1)" />
          <text x={12} y={4} dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            {homeLabel}
          </text>
          <circle cx={90} cy={4} r={3} fill="var(--chart-2)" />
          <text x={98} y={4} dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
            {awayLabel}
          </text>
          <text x={width - margin.right - 4} y={4} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground" style={{ fontSize: 9, letterSpacing: 1 }}>
            {mode === "model"
              ? "model expected path · live shots not streamed"
              : "● goal · ○ shot · radius = xG"}
          </text>
        </g>
      </svg>

      {tooltipData && (
        <TooltipInPortal
          left={tooltipLeft}
          top={tooltipTop}
          style={{ ...defaultStyles, background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", padding: "6px 8px", fontSize: 11, lineHeight: 1.3, borderRadius: 6 }}
        >
          {tooltipData.kind === "shot" && (
            <>
              <div className="font-mono">
                {tooltipData.shot.minute}'{" "}
                <span style={{ color: tooltipData.shot.team === "home" ? "var(--chart-1)" : "var(--chart-2)" }}>
                  {tooltipData.shot.team === "home" ? homeLabel : awayLabel}
                </span>
              </div>
              <div>
                {tooltipData.shot.isGoal ? "Goal" : "Shot"} ·{" "}
                <span className="font-mono">xG {tooltipData.shot.xg.toFixed(2)}</span>
              </div>
              {tooltipData.shot.player && (
                <div className="text-muted-foreground">{tooltipData.shot.player}</div>
              )}
            </>
          )}
        </TooltipInPortal>
      )}
    </div>
  );
}

function sumUntil(points: XgPoint[], minute: number, key: "home" | "away"): number {
  let v = 0;
  for (const p of points) {
    if (p.minute <= minute) v = p[key];
    else break;
  }
  return v;
}
