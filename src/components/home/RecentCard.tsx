import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { HomeBundleEvent } from "@/lib/bsd.functions";
import type { CardEnrichment } from "@/lib/home-enrichments.functions";

import { PairBar, XgEdgeChip } from "./CardEnrichments";

function formatShort(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TeamScoreRow({
  name,
  side,
  score,
  opponentScore,
  xgDelta,
}: {
  name: string;
  side: "home" | "away";
  score: number | null;
  opponentScore: number | null;
  xgDelta?: { goals: number; xg: number };
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
        {xgDelta && <XgEdgeChip goals={xgDelta.goals} xg={xgDelta.xg} side={side} />}
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

export function RecentCard({ ev, enr }: { ev: HomeBundleEvent; enr?: CardEnrichment }) {
  const hXg = enr?.finalXg?.home;
  const aXg = enr?.finalXg?.away;
  const hGoals = ev.home_score;
  const aGoals = ev.away_score;
  return (
    <Link
      to="/match/$eventId"
      params={{ eventId: String(ev.id) }}
      className="group block rounded-lg border border-border/60 bg-card hover:border-foreground/40 transition-colors p-4"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="truncate">
          {ev.league_country ? `${ev.league_country} · ` : ""}
          {ev.league_name ?? `League #${ev.league_id}`}
        </span>
        <span className="ml-2 shrink-0 border border-border/60 rounded px-1.5 py-0.5 text-[9px]">
          FT
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        <TeamScoreRow
          name={ev.home_team}
          side="home"
          score={hGoals}
          opponentScore={aGoals}
          xgDelta={
            typeof hGoals === "number" && typeof hXg === "number"
              ? { goals: hGoals, xg: hXg }
              : undefined
          }
        />
        <TeamScoreRow
          name={ev.away_team}
          side="away"
          score={aGoals}
          opponentScore={hGoals}
          xgDelta={
            typeof aGoals === "number" && typeof aXg === "number"
              ? { goals: aGoals, xg: aXg }
              : undefined
          }
        />
      </div>

      {enr?.finalXg && (
        <div className="mt-3.5">
          <PairBar label="Final xG" pair={enr.finalXg} fmt="dec1" />
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

      <div className="mt-3.5 flex items-center justify-between text-[11px]">
        <span className="font-mono text-muted-foreground">{formatShort(ev.event_date)}</span>
        <span className="inline-flex items-center gap-1 text-primary opacity-70 group-hover:opacity-100 transition-opacity">
          Post-match
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
