// Lineup-anchored live player ratings. Two-column layout (home / away),
// sorted by rating within side. Shows every player on the pitch + subs.

import type { LiveRating } from "@/lib/live-derive";

export function LiveRatings({
  ratings,
  homeTeam,
  awayTeam,
  hasLineups,
}: {
  ratings: LiveRating[];
  homeTeam: string;
  awayTeam: string;
  hasLineups: boolean;
}) {
  if (ratings.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Ratings populate as players touch the ball, get on the sheet, or join from the bench.
      </div>
    );
  }
  const home = ratings.filter((r) => r.team === "home").sort((a, b) => b.rating - a.rating);
  const away = ratings.filter((r) => r.team === "away").sort((a, b) => b.rating - a.rating);
  const avgHome = home.length ? home.reduce((s, r) => s + r.rating, 0) / home.length : 0;
  const avgAway = away.length ? away.reduce((s, r) => s + r.rating, 0) / away.length : 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <Column rows={home} label={homeTeam} side="home" />
        <Column rows={away} label={awayTeam} side="away" />
      </div>
      <div className="border-t border-border/40 pt-3">
        <AvgBar homeLabel={homeTeam} awayLabel={awayTeam} home={avgHome} away={avgAway} />
        {!hasLineups && (
          <p className="text-[11px] italic text-muted-foreground mt-2">
            Lineups not yet confirmed — only players appearing in incidents are listed.
          </p>
        )}
      </div>
    </div>
  );
}

function Column({
  rows,
  label,
  side,
}: {
  rows: LiveRating[];
  label: string;
  side: "home" | "away";
}) {
  const color = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{rows.length} players</span>
      </div>
      {rows.map((r) => (
        <Row key={`${r.team}:${r.player}`} r={r} color={color} />
      ))}
    </div>
  );
}

function Row({ r, color }: { r: LiveRating; color: string }) {
  const tier =
    r.rating >= 8.5
      ? "text-emerald-300"
      : r.rating >= 7.5
        ? "text-foreground"
        : r.rating >= 6.0
          ? "text-foreground"
          : "text-muted-foreground";
  const pct = (r.rating / 10) * 100;
  return (
    <div className="grid grid-cols-[22px_1fr_44px_46px] items-center gap-2 px-1.5 py-1 rounded hover:bg-surface-1/40 transition-colors">
      <span className="font-mono text-[10px] tabular-nums text-muted-foreground text-center">
        {r.jersey ?? ""}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm truncate font-medium">{r.player}</span>
          {!r.isStarter && <span className="text-[9px] uppercase tracking-[0.16em] rounded bg-emerald-500/15 text-emerald-300 px-1">sub</span>}
          {!r.isOnPitch && r.isStarter && <span className="text-[9px] uppercase tracking-[0.16em] rounded bg-rose-500/15 text-rose-300 px-1">off</span>}
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
          {r.position && <span>{r.position}</span>}
          <span className="font-mono tabular-nums normal-case tracking-normal">{r.minutesPlayed}'</span>
          {(r.goals || r.assists || r.yellows || r.reds) > 0 && (
            <span className="font-mono tabular-nums normal-case tracking-normal">
              {r.goals ? <span className="text-emerald-300">{r.goals}G </span> : null}
              {r.assists ? <span className="text-sky-300">{r.assists}A </span> : null}
              {r.yellows ? <span className="text-yellow-300">{r.yellows}Y </span> : null}
              {r.reds ? <span className="text-rose-400">{r.reds}R</span> : null}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-surface-1 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>
      <span className={`font-mono text-sm tabular-nums text-right ${tier}`}>
        {r.rating.toFixed(2)}
      </span>
    </div>
  );
}

function AvgBar({
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
  const total = Math.max(0.01, home + away);
  const hPct = (home / total) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>
          {homeLabel} <span className="font-mono text-foreground tabular-nums">{home.toFixed(2)}</span>
        </span>
        <span>Average XI</span>
        <span>
          <span className="font-mono text-foreground tabular-nums">{away.toFixed(2)}</span> {awayLabel}
        </span>
      </div>
      <div className="h-1.5 w-full bg-surface-1 rounded-full overflow-hidden flex">
        <div className="h-full" style={{ width: `${hPct}%`, background: "var(--chart-1)", opacity: 0.85 }} />
        <div className="h-full" style={{ width: `${100 - hPct}%`, background: "var(--chart-2)", opacity: 0.85 }} />
      </div>
    </div>
  );
}
