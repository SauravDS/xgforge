import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import type { HomeBundleEvent } from "@/lib/bsd.functions";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Kicking off";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function FeaturedFixture({ upcoming }: { upcoming: HomeBundleEvent[] }) {
  const featured = upcoming[0];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!featured) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [featured]);

  if (!featured) return null;

  const kickoff = new Date(featured.event_date);
  const countdown = formatCountdown(kickoff.getTime() - now);
  const ko = kickoff.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link
      to="/match/$eventId"
      params={{ eventId: String(featured.id) }}
      className="group block rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary/70 transition-colors overflow-hidden"
    >
      <div className="px-5 sm:px-7 py-6 sm:py-7 relative">
        <div className="pitch-lines absolute inset-0 opacity-[0.08] pointer-events-none" />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3 w-3" />
            Match of the day
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate max-w-[60%] text-right">
            {featured.league_country ? `${featured.league_country} · ` : ""}
            {featured.league_name ?? `League #${featured.league_id}`}
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="font-display text-2xl sm:text-4xl tracking-tight truncate">
            {featured.home_team}
          </div>
          <div className="text-center">
            <div className="font-mono text-xs sm:text-sm tabular-nums text-muted-foreground">
              vs
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary mt-1">
              {countdown}
            </div>
          </div>
          <div className="font-display text-2xl sm:text-4xl tracking-tight truncate text-right">
            {featured.away_team}
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 text-[11px]">
          <span className="font-mono text-muted-foreground">{ko}</span>
          <span className="inline-flex items-center gap-1 text-primary opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-[0.18em]">
            Open simulator
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
