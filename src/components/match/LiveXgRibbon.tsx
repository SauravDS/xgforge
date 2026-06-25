// Live xG race ribbon — cumulative xG (or modeled λ_t) home vs away
// drawn as a single 8-px stacked bar with a center pivot.

export function LiveXgRibbon({
  home,
  away,
  homeLabel,
  awayLabel,
}: {
  home: number;
  away: number;
  homeLabel: string;
  awayLabel: string;
}) {
  const total = Math.max(0.001, home + away);
  const hPct = (home / total) * 100;
  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-mono mb-1">
        <span className="text-chart-1">{homeLabel.slice(0, 16)} <span className="text-foreground">{home.toFixed(2)}</span></span>
        <span>xG race</span>
        <span className="text-chart-2"><span className="text-foreground">{away.toFixed(2)}</span> {awayLabel.slice(0, 16)}</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden bg-surface-1 flex">
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${hPct}%`, background: "var(--chart-1)" }}
        />
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${100 - hPct}%`, background: "var(--chart-2)" }}
        />
      </div>
    </div>
  );
}
