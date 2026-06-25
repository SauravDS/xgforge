// 60-px sparkline of live home-win probability across the match.

import type { WinProbPoint } from "@/lib/live-derive";

export function LiveHeaderSparkline({
  points,
  height = 36,
}: {
  points: WinProbPoint[];
  height?: number;
}) {
  if (points.length < 2) return null;
  const W = 240;
  const H = height;
  const maxMin = Math.max(90, points[points.length - 1].minute);
  const x = (m: number) => (m / maxMin) * W;
  const y = (p: number) => H - p * H;
  const homeLine = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(p.home).toFixed(1)}`).join(" ");
  const awayLine = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.minute).toFixed(1)},${y(1 - p.away).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }} aria-hidden>
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="hsl(var(--border) / 0.6)" strokeDasharray="2 3" strokeWidth={0.5} />
      <path d={homeLine} fill="none" stroke="var(--chart-1)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <path d={awayLine} fill="none" stroke="var(--chart-2)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" strokeOpacity={0.85} />
      <circle cx={x(last.minute)} cy={y(last.home)} r={2.5} fill="var(--chart-1)" />
    </svg>
  );
}
