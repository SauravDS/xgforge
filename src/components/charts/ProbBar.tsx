// Three-segment Home / Draw / Away probability bar with labels above and
// numeric values below. Used in the match header and the simulator panel.

export function ProbBar({
  homeLabel,
  awayLabel,
  home,
  draw,
  away,
  size = "md",
}: {
  homeLabel: string;
  awayLabel: string;
  home: number;
  draw: number;
  away: number;
  size?: "sm" | "md";
}) {
  const sm = size === "sm";
  return (
    <div>
      <div className={`flex justify-between ${sm ? "text-[10px]" : "text-[11px]"} mb-1`}>
        <span className="text-chart-1 font-medium truncate max-w-[40%]">{homeLabel}</span>
        <span className="text-muted-foreground">Draw</span>
        <span className="text-chart-2 font-medium truncate max-w-[40%] text-right">
          {awayLabel}
        </span>
      </div>
      <div className={`flex ${sm ? "h-2" : "h-3"} rounded-md overflow-hidden bg-border/40`}>
        <div className="bg-chart-1" style={{ width: `${home * 100}%` }} />
        <div className="bg-muted/70" style={{ width: `${draw * 100}%` }} />
        <div className="bg-chart-2" style={{ width: `${away * 100}%` }} />
      </div>
      <div className={`flex justify-between ${sm ? "text-[10px]" : "text-[11px]"} font-mono tabular-nums mt-1`}>
        <span>{(home * 100).toFixed(1)}%</span>
        <span>{(draw * 100).toFixed(1)}%</span>
        <span>{(away * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}
