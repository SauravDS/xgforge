// Match Pulse — three stacked diverging bars showing attack share,
// dangerous-attack share, and ball-safe share at the current moment.

import type { LiveStatsBundle } from "@/lib/match-stats";

export function MatchPulseStrip({
  stats,
  homeLabel,
  awayLabel,
}: {
  stats: LiveStatsBundle;
  homeLabel: string;
  awayLabel: string;
}) {
  const rows: { label: string; home: number; away: number }[] = [
    { label: "Attack", home: stats.home.attackPct, away: stats.away.attackPct },
    { label: "Dangerous attack", home: stats.home.dangerousAttackPct, away: stats.away.dangerousAttackPct },
    { label: "Ball safe", home: stats.home.ballSafePct, away: stats.away.ballSafePct },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold tracking-tight">Match pulse</h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">share now</span>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const total = Math.max(0.0001, r.home + r.away);
          const hPct = (r.home / total) * 100;
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] mb-1">
                <span className="font-mono text-foreground tabular-nums">{Math.round(r.home)}%</span>
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-mono text-foreground tabular-nums">{Math.round(r.away)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-surface-1 flex">
                <div className="h-full transition-[width] duration-500" style={{ width: `${hPct}%`, background: "var(--chart-1)", opacity: 0.9 }} title={homeLabel} />
                <div className="h-full transition-[width] duration-500" style={{ width: `${100 - hPct}%`, background: "var(--chart-2)", opacity: 0.9 }} title={awayLabel} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
