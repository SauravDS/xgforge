// Last-5 form rendered as a radial arc — each segment is a slice of the
// circle whose fill represents the result (W full, D half, L empty). The
// inner number is PPG over last 5; the sub-line is goal difference (last 5
// when computable, else season GD from standings).

import type { StandingsMap } from "@/lib/bsd.functions";

export function FormArc({
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  standings,
}: {
  homeTeamId: number | undefined;
  awayTeamId: number | undefined;
  homeTeam: string;
  awayTeam: string;
  standings: StandingsMap;
}) {
  const h = homeTeamId !== undefined ? standings[String(homeTeamId)] : undefined;
  const a = awayTeamId !== undefined ? standings[String(awayTeamId)] : undefined;
  if (!h?.form && !a?.form) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold tracking-tight text-sm">Form arc · last 5</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          radial · most recent first
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormArcCard team={homeTeam} tone="var(--chart-1)" form={h?.form ?? null} gd={h ? h.gf - h.ga : null} />
        <FormArcCard team={awayTeam} tone="var(--chart-2)" form={a?.form ?? null} gd={a ? a.gf - a.ga : null} />
      </div>
    </section>
  );
}

function FormArcCard({
  team,
  tone,
  form,
  gd,
}: {
  team: string;
  tone: string;
  form: string | null;
  gd: number | null;
}) {
  // Take the LAST 5 chars (most recent) — chart goes clockwise starting top.
  const last5 = (form ?? "").slice(-5).split("");
  // Pad to 5 with empties
  while (last5.length < 5) last5.unshift("");
  const points = last5.reduce((acc, c) => acc + (c === "W" ? 3 : c === "D" ? 1 : 0), 0);
  const matchesPlayed = last5.filter((c) => c === "W" || c === "D" || c === "L").length;
  const ppg = matchesPlayed > 0 ? points / matchesPlayed : 0;

  const size = 110;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 48;
  const rInner = 32;
  const segmentArc = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2; // start at top

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {last5.map((c, i) => {
            const a0 = startAngle + i * segmentArc + 0.04;
            const a1 = startAngle + (i + 1) * segmentArc - 0.04;
            // Inner radius shrinks based on result (W full, D mid, L tiny)
            const fillR =
              c === "W" ? rOuter : c === "D" ? rInner + (rOuter - rInner) * 0.55 : c === "L" ? rInner + (rOuter - rInner) * 0.18 : rInner + 1;
            const color =
              c === "W" ? "var(--up)" : c === "D" ? "var(--accent)" : c === "L" ? "var(--down)" : "var(--border)";
            return (
              <g key={i}>
                <path
                  d={annularSector(cx, cy, rInner, rOuter, a0, a1)}
                  fill="var(--border)"
                  opacity={0.35}
                />
                <path
                  d={annularSector(cx, cy, rInner, fillR, a0, a1)}
                  fill={color}
                  opacity={c ? 0.9 : 0}
                />
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={rInner - 2} fill="var(--card)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-mono text-lg tabular-nums font-semibold leading-none">{ppg.toFixed(2)}</div>
          <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">PPG · L5</div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tone }} />
          <span className="font-semibold text-sm truncate">{team}</span>
        </div>
        <div className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
          {points} pts · {last5.filter((c) => c === "W").length}W {last5.filter((c) => c === "D").length}D {last5.filter((c) => c === "L").length}L
        </div>
        {gd !== null && (
          <div
            className={`mt-0.5 font-mono text-[11px] tabular-nums ${gd > 0 ? "text-up" : gd < 0 ? "text-down" : "text-muted-foreground"}`}
          >
            {gd > 0 ? "+" : ""}
            {gd} GD season
          </div>
        )}
      </div>
    </div>
  );
}

function annularSector(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number,
): string {
  const x0o = cx + rOut * Math.cos(a0);
  const y0o = cy + rOut * Math.sin(a0);
  const x1o = cx + rOut * Math.cos(a1);
  const y1o = cy + rOut * Math.sin(a1);
  const x0i = cx + rIn * Math.cos(a1);
  const y0i = cy + rIn * Math.sin(a1);
  const x1i = cx + rIn * Math.cos(a0);
  const y1i = cy + rIn * Math.sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${x0o} ${y0o}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x0i} ${y0i}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x1i} ${y1i}`,
    "Z",
  ].join(" ");
}
