// Possession donut: two arcs sharing 100%. Uses CSS tokens via class names.

export function PossessionDonut({
  home,
  away,
  size = 90,
  thickness = 10,
  homeLabel,
  awayLabel,
}: {
  home: number; // 0..100
  away: number; // 0..100
  size?: number;
  thickness?: number;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const total = home + away || 1;
  const hPct = (home / total) * 100;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const hLen = (c * hPct) / 100;
  const aLen = c - hLen;
  return (
    <div className="inline-flex items-center gap-3" aria-label="Possession">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={thickness}
          opacity={0.4}
        />
        {/* away arc (drawn first, full ring; then home overlays) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="text-chart-2"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeDasharray={`${aLen} ${hLen}`}
          strokeDashoffset={-hLen}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          className="text-chart-1"
          stroke="currentColor"
          strokeWidth={thickness}
          strokeDasharray={`${hLen} ${aLen}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-mono"
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(hPct)}%
        </text>
      </svg>
      <div className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-chart-1" />
          {homeLabel ?? "Home"} <span className="font-mono text-foreground">{Math.round(hPct)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-chart-2" />
          {awayLabel ?? "Away"}{" "}
          <span className="font-mono text-foreground">{Math.round(100 - hPct)}</span>
        </span>
      </div>
    </div>
  );
}
