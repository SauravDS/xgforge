// Center-anchored diverging bar. Both sides extend from the midline; the
// dominant side gets full saturation, the other side a muted variant.
// A small percentage chip on the leading side communicates magnitude
// in one glance — same idiom Opta / FBref use for head-to-head stat rows.

export function DivergingStatBar({
  label,
  home,
  away,
  format = (n) => String(n),
  prefer = "higher",
}: {
  label: string;
  home: number;
  away: number;
  format?: (n: number) => string;
  prefer?: "higher" | "lower";
}) {
  const total = Math.max(0.0001, Math.abs(home) + Math.abs(away));
  const hShare = Math.abs(home) / total;
  const aShare = Math.abs(away) / total;

  const homeWins = prefer === "higher" ? home > away : home < away;
  const awayWins = prefer === "higher" ? away > home : away < home;
  const diff = Math.abs(hShare - aShare); // 0..1 — magnitude of dominance

  // Magnitude-driven opacity. Lopsided splits saturate; balanced fade.
  const hOpacity = homeWins ? 0.95 : 0.45;
  const aOpacity = awayWins ? 0.95 : 0.45;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={`font-mono tabular-nums ${homeWins ? "text-foreground font-semibold" : "text-muted-foreground"}`}
        >
          {format(home)}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span
          className={`font-mono tabular-nums ${awayWins ? "text-foreground font-semibold" : "text-muted-foreground"}`}
        >
          {format(away)}
        </span>
      </div>
      <div className="relative h-2 flex items-center">
        {/* center spine */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border" />
        {/* home bar grows leftward from center */}
        <div className="absolute right-1/2 top-0 bottom-0 flex items-center justify-end" style={{ width: "50%" }}>
          <div
            className="h-full rounded-l-sm transition-[width] duration-500"
            style={{
              width: `${hShare * 100}%`,
              background: "var(--chart-1)",
              opacity: hOpacity,
            }}
          />
        </div>
        {/* away bar grows rightward from center */}
        <div className="absolute left-1/2 top-0 bottom-0 flex items-center" style={{ width: "50%" }}>
          <div
            className="h-full rounded-r-sm transition-[width] duration-500"
            style={{
              width: `${aShare * 100}%`,
              background: "var(--chart-2)",
              opacity: aOpacity,
            }}
          />
        </div>
        {/* edge chip on the dominant side */}
        {diff > 0.04 && (
          <span
            className="absolute -top-0.5 text-[8.5px] font-mono tabular-nums px-1 rounded bg-background/80 border border-border"
            style={
              homeWins
                ? { right: `calc(50% + ${hShare * 50}% + 2px)` }
                : { left: `calc(50% + ${aShare * 50}% + 2px)` }
            }
          >
            +{Math.round(diff * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
