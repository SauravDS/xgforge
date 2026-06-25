// Head-to-head three-segment stacked bar. Hidden when there's no history.

import type { BsdH2H } from "@/lib/bsd-types";

export function HeadToHeadStrip({
  h2h,
  homeLabel,
  awayLabel,
}: {
  h2h: BsdH2H | null;
  homeLabel: string;
  awayLabel: string;
}) {
  if (!h2h || !h2h.total_matches || h2h.total_matches <= 0) return null;
  const total = Math.max(1, h2h.total_matches);
  const hPct = (h2h.home_wins / total) * 100;
  const dPct = (h2h.draws / total) * 100;
  const aPct = 100 - hPct - dPct;
  return (
    <div className="rounded-md border border-border/60 bg-surface-1/40 px-3 py-2">
      <div className="flex items-baseline justify-between mb-1.5 text-[10px] uppercase tracking-[0.18em]">
        <span className="font-mono tabular-nums text-chart-1">{homeLabel} {h2h.home_wins}W</span>
        <span className="text-muted-foreground">
          H2H · {h2h.total_matches} matches
          {h2h.avg_total_goals != null && (
            <span className="ml-1.5 font-mono tabular-nums text-foreground normal-case">
              ⌀ {h2h.avg_total_goals.toFixed(2)} gpg
            </span>
          )}
        </span>
        <span className="font-mono tabular-nums text-chart-2">{h2h.away_wins}W {awayLabel}</span>
      </div>
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-surface-1">
        <div style={{ width: `${hPct}%`, background: "var(--chart-1)" }} />
        <div style={{ width: `${dPct}%`, background: "hsl(var(--muted-foreground) / 0.6)" }} />
        <div style={{ width: `${aPct}%`, background: "var(--chart-2)" }} />
      </div>
      <div className="mt-1 text-[10px] font-mono tabular-nums text-muted-foreground text-center">
        {h2h.draws} draws
      </div>
    </div>
  );
}
