// Percentile radar. N axes, each value 0..1 represents the percentile within
// position+league. Renders concentric rings (25/50/75/100), an optional
// league-median ghost polygon, and the player polygon with gradient fill.

export type RadarAxis = { key: string; label: string; value: number /* 0..1 */ };

export function PlayerRadar({
  axes,
  ghost,
  size = 180,
  className,
}: {
  axes: RadarAxis[];
  /** Optional comparison polygon (e.g. league median per axis, 0..1). */
  ghost?: number[];
  size?: number;
  className?: string;
}) {
  const n = axes.length;
  if (n < 3) return null;
  const r = size / 2 - 22;
  const cx = size / 2;
  const cy = size / 2;
  const id = `radar-${Math.round(Math.random() * 1e6)}`;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, v: number) => {
    const a = angle(i);
    const rr = Math.max(0, Math.min(1, v)) * r;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as const;
  };
  const ringPoints = (k: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = angle(i);
      return `${(cx + Math.cos(a) * r * k).toFixed(1)},${(cy + Math.sin(a) * r * k).toFixed(1)}`;
    }).join(" ");

  const polyPoints = (values: number[]) =>
    axes
      .map((_, i) => {
        const [x, y] = point(i, values[i] ?? 0);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.10" />
        </radialGradient>
      </defs>

      {/* rings */}
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={ringPoints(k)}
          fill="none"
          stroke="var(--border)"
          strokeOpacity={k === 1 ? 0.7 : 0.35}
          strokeDasharray={k === 0.5 ? "0" : "2 3"}
        />
      ))}
      {/* ring labels (25/50/75/100 percentile) along top axis */}
      {[0.25, 0.5, 0.75].map((k) => (
        <text
          key={`rl-${k}`}
          x={cx + 3}
          y={cy - r * k}
          dominantBaseline="middle"
          className="fill-muted-foreground/60 font-mono"
          style={{ fontSize: 7 }}
        >
          {Math.round(k * 100)}
        </text>
      ))}

      {/* axes */}
      {axes.map((_, i) => {
        const a = angle(i);
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border)"
            strokeOpacity={0.5}
          />
        );
      })}

      {/* ghost (league median) polygon */}
      {ghost && ghost.length === n && (
        <polygon
          points={polyPoints(ghost)}
          fill="var(--muted-foreground)"
          fillOpacity={0.08}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      )}

      {/* player polygon */}
      <polygon
        points={polyPoints(axes.map((a) => a.value))}
        fill={`url(#${id})`}
        stroke="var(--primary)"
        strokeWidth={1.75}
      />

      {/* dots */}
      {axes.map((ax, i) => {
        const [x, y] = point(i, ax.value);
        return (
          <circle key={ax.key} cx={x} cy={y} r={2.5} className="fill-primary" />
        );
      })}

      {/* labels */}
      {axes.map((ax, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (r + 12);
        const ly = cy + Math.sin(a) * (r + 12);
        const anchor =
          Math.cos(a) > 0.3 ? "start" : Math.cos(a) < -0.3 ? "end" : "middle";
        return (
          <g key={`${ax.key}-l`}>
            <text
              x={lx}
              y={ly - 4}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 9, letterSpacing: 0.5, textTransform: "uppercase" }}
            >
              {ax.label}
            </text>
            <text
              x={lx}
              y={ly + 6}
              textAnchor={anchor}
              dominantBaseline="middle"
              className="fill-foreground font-mono tabular-nums"
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              {Math.round(ax.value * 100)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
