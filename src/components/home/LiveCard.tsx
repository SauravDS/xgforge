import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { HomeBundleEvent } from "@/lib/bsd.functions";
import type { CardEnrichment } from "@/lib/home-enrichments.functions";

import { MomentumChip, PairBar } from "./CardEnrichments";

function liveMinute(eventDate: string, currentMinute?: number | null): number {
  if (typeof currentMinute === "number" && Number.isFinite(currentMinute) && currentMinute > 0) {
    return Math.max(1, Math.min(120, Math.round(currentMinute)));
  }
  const m = Math.floor((Date.now() - new Date(eventDate).getTime()) / 60000);
  return Math.max(1, Math.min(120, m));
}

function TeamScoreRow({
  name,
  side,
  score,
  opponentScore,
}: {
  name: string;
  side: "home" | "away";
  score: number | null;
  opponentScore: number | null;
}) {
  const won =
    typeof score === "number" && typeof opponentScore === "number" && score > opponentScore;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-block h-2 w-2 rounded-sm ${
            side === "home" ? "bg-chart-1" : "bg-chart-2"
          }`}
        />
        <span className={`truncate text-sm ${won ? "font-semibold" : ""}`}>{name}</span>
      </span>
      {typeof score === "number" ? (
        <span
          className={`font-mono text-xl leading-none tabular-nums ${
            won ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {score}
        </span>
      ) : null}
    </div>
  );
}

export function LiveCard({ ev, enr }: { ev: HomeBundleEvent; enr?: CardEnrichment }) {
  return (
    <Link
      to="/match/$eventId"
      params={{ eventId: String(ev.id) }}
      className="group block rounded-lg border border-live/30 bg-live/[0.04] hover:border-live/60 transition-colors p-4 relative"
    >
      <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-live">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
        </span>
        <span className="font-mono tabular-nums">{liveMinute(ev.event_date, ev.current_minute)}'</span>
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground pr-16">
        <span className="truncate">
          {ev.league_country ? `${ev.league_country} · ` : ""}
          {ev.league_name ?? `League #${ev.league_id}`}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <TeamScoreRow
          name={ev.home_team}
          side="home"
          score={ev.home_score}
          opponentScore={ev.away_score}
        />
        <TeamScoreRow
          name={ev.away_team}
          side="away"
          score={ev.away_score}
          opponentScore={ev.home_score}
        />
      </div>

      {enr?.liveXg && (
        <div className="mt-3.5">
          <PairBar label="Live xG" pair={enr.liveXg} fmt="dec1" accent="live" />
        </div>
      )}
      {enr?.shotsOnTarget && (
        <div className="mt-2">
          <PairBar label="Shots on target" pair={enr.shotsOnTarget} fmt="int" />
        </div>
      )}
      {enr?.possession && (
        <div className="mt-2">
          <PairBar label="Possession" pair={enr.possession} fmt="pct" scaleMax={100} />
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        {typeof enr?.momentum === "number" ? (
          <MomentumChip momentum={enr.momentum} />
        ) : (
          <span>In play</span>
        )}
        <span className="inline-flex items-center gap-1 text-primary opacity-70 group-hover:opacity-100 transition-opacity">
          Live view <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
