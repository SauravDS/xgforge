// Compact live set-piece card — corners, free kicks, throw-ins, goal kicks,
// offsides per side. Falls back to corners + fouls when stats not present.

import type { LiveTeamStats } from "@/lib/match-stats";

export function LiveSetPieceCard({
  homeCorners,
  awayCorners,
  homeFouls,
  awayFouls,
  homeLabel,
  awayLabel,
  home,
  away,
}: {
  homeCorners: number;
  awayCorners: number;
  homeFouls: number;
  awayFouls: number;
  homeLabel: string;
  awayLabel: string;
  home?: LiveTeamStats | null;
  away?: LiveTeamStats | null;
}) {
  const rows: { label: string; h: number; a: number }[] = home && away
    ? [
        { label: "Corners", h: home.cornerKicks, a: away.cornerKicks },
        { label: "Free kicks", h: home.freeKicks, a: away.freeKicks },
        { label: "Throw-ins", h: home.throwIns, a: away.throwIns },
        { label: "Goal kicks", h: home.goalKicks, a: away.goalKicks },
        { label: "Offsides", h: home.offsides, a: away.offsides },
        { label: "Fouls", h: home.fouls, a: away.fouls },
      ].filter((r) => r.h + r.a > 0)
    : [
        { label: "Corners", h: homeCorners, a: awayCorners },
        { label: "Fouls", h: homeFouls, a: awayFouls },
      ];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold tracking-tight">Set pieces &amp; fouls</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          live volume
        </span>
      </div>
      {rows.map((r) => (
        <Row
          key={r.label}
          label={r.label}
          h={r.h}
          a={r.a}
          max={Math.max(1, r.h, r.a)}
          homeLabel={homeLabel}
          awayLabel={awayLabel}
        />
      ))}
    </div>
  );
}

function Row({
  label,
  h,
  a,
  max,
  homeLabel,
  awayLabel,
}: {
  label: string;
  h: number;
  a: number;
  max: number;
  homeLabel: string;
  awayLabel: string;
}) {
  const hPct = (h / max) * 100;
  const aPct = (a / max) * 100;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
        <span className="font-mono text-foreground tabular-nums">{h}</span>
        <span>{label}</span>
        <span className="font-mono text-foreground tabular-nums">{a}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-surface-1 rounded-full overflow-hidden flex justify-end">
          <div className="h-full rounded-l-full transition-[width] duration-500" style={{ width: `${hPct}%`, background: "var(--chart-1)" }} title={`${homeLabel}: ${h}`} />
        </div>
        <div className="flex-1 h-1.5 bg-surface-1 rounded-full overflow-hidden">
          <div className="h-full rounded-r-full transition-[width] duration-500" style={{ width: `${aPct}%`, background: "var(--chart-2)" }} title={`${awayLabel}: ${a}`} />
        </div>
      </div>
    </div>
  );
}
