// Shot quality — five-segment stacked bar per side.
// inside-box · outside-box · blocked · off-target · on-target

import type { LiveTeamStats } from "@/lib/match-stats";

const SEGS = [
  { key: "shotsOnTarget", label: "on target", color: "var(--chart-1)" },
  { key: "shotsInsideBox", label: "inside box", color: "color-mix(in oklch, var(--chart-1) 70%, transparent)" },
  { key: "shotsOutsideBox", label: "outside", color: "color-mix(in oklch, var(--chart-1) 45%, transparent)" },
  { key: "blockedShots", label: "blocked", color: "hsl(var(--muted-foreground) / 0.55)" },
  { key: "shotsOffTarget", label: "off target", color: "hsl(var(--muted-foreground) / 0.35)" },
] as const;

export function ShotQualityStrip({
  home,
  away,
  homeLabel,
  awayLabel,
}: {
  home: LiveTeamStats;
  away: LiveTeamStats;
  homeLabel: string;
  awayLabel: string;
}) {
  if (home.totalShots === 0 && away.totalShots === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h4 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
          Shot quality
        </h4>
        <div className="flex gap-3 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {SEGS.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <Row stats={home} label={homeLabel} side="home" />
      <Row stats={away} label={awayLabel} side="away" />
    </div>
  );
}

function Row({ stats, label, side }: { stats: LiveTeamStats; label: string; side: "home" | "away" }) {
  const total = Math.max(1, stats.totalShots);
  const accent = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] mb-1">
        <span style={{ color: accent }} className="truncate font-mono">{label}</span>
        <span className="font-mono tabular-nums text-foreground">{stats.totalShots} shots</span>
      </div>
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-1">
        {SEGS.map((s) => {
          const v = (stats as unknown as Record<string, number>)[s.key] ?? 0;
          const pct = (v / total) * 100;
          if (pct <= 0) return null;
          const bg = side === "away" && s.key !== "blockedShots" && s.key !== "shotsOffTarget"
            ? s.color.replace("--chart-1", "--chart-2")
            : s.color;
          return (
            <div
              key={s.key}
              style={{ width: `${pct}%`, background: bg }}
              title={`${s.label}: ${Math.round(v)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
