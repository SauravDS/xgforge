// Shared "live match header" body — the score + win-probability + xG ribbon
// + residual/edge chip row that drives both the match-detail page header and
// the homepage mini match center carousel. Same components, same data —
// `density="compact"` only adjusts sizing.

import { useMemo } from "react";

import { LiveHeaderSparkline } from "@/components/match/LiveHeaderSparkline";
import { LiveScoreFlash } from "@/components/match/LiveScoreFlash";
import { LiveXgRibbon } from "@/components/match/LiveXgRibbon";
import { VenueConditionsBar } from "@/components/match/VenueConditionsBar";
import { ProbBar } from "@/components/charts/ProbBar";
import type { BsdEventListItem, BsdVenueInfo, Json } from "@/lib/bsd-types";
import { computeLiveMinute, computeWinProbCurve } from "@/lib/live-derive";
import { parseLiveTeamStats } from "@/lib/match-stats";
import { useLiveSimulation, type MatchSimulation } from "@/lib/use-match-simulation";

type Bundle = {
  event: (BsdEventListItem & { weather?: Json; attendance?: number | null }) | null;
  incidents: unknown;
  statistics: unknown;
  venue: BsdVenueInfo | null;
};

export function LiveMatchHeaderBlock({
  data,
  simulation,
  phase,
  density = "default",
}: {
  data: Bundle;
  simulation: MatchSimulation;
  phase: "live" | "finished" | "upcoming";
  density?: "default" | "compact";
}) {
  const ev = data.event;
  const isLive = phase === "live";
  const isPlayed = phase === "live" || phase === "finished";
  const compact = density === "compact";
  const liveMinute = useMemo(
    () =>
      isPlayed && ev
        ? computeLiveMinute(data.incidents, ev.event_date, ev.status, ev.current_minute)
        : null,
    [isPlayed, data.incidents, ev],
  );
  const live = useLiveSimulation(
    simulation,
    data.incidents,
    liveMinute ?? 0,
    ev?.home_team_id,
    ev?.away_team_id,
    { home: ev?.home_score ?? null, away: ev?.away_score ?? null },
    data.statistics,
  );
  const wpCurve = useMemo(
    () =>
      isPlayed && ev
        ? computeWinProbCurve(
            data.incidents,
            ev.home_team_id,
            ev.away_team_id,
            simulation.sim.lambdaHome,
            simulation.sim.lambdaAway,
            liveMinute ?? 0,
            data.statistics,
          )
        : [],
    [
      isPlayed,
      data.incidents,
      ev,
      simulation.sim.lambdaHome,
      simulation.sim.lambdaAway,
      liveMinute,
      data.statistics,
    ],
  );

  if (!ev) return null;
  const { sim, source } = simulation;
  const probs = isPlayed
    ? { home: live.homeWin, draw: live.draw, away: live.awayWin }
    : { home: sim.homeWin, draw: sim.draw, away: sim.awayWin };
  const lambdaH = isPlayed ? live.remH : sim.lambdaHome;
  const lambdaA = isPlayed ? live.remA : sim.lambdaAway;

  const edgePct = Math.round(
    (Math.max(probs.home, probs.away) - Math.min(probs.home, probs.away)) * 100,
  );
  const favored: "home" | "away" | "even" =
    Math.abs(probs.home - probs.away) < 0.04 ? "even" : probs.home > probs.away ? "home" : "away";
  const showScore = phase !== "upcoming";

  const teamNameClass = compact
    ? "font-display tracking-tight truncate text-base sm:text-xl"
    : "font-display tracking-tight truncate text-xl sm:text-3xl md:text-4xl";
  const staticScoreClass = compact
    ? "font-mono tabular-nums text-2xl sm:text-3xl"
    : "font-mono tabular-nums text-3xl sm:text-4xl md:text-5xl";


  return (
    <div>
      <VenueConditionsBar
        venue={data.venue}
        weather={ev.weather as Parameters<typeof VenueConditionsBar>[0]["weather"]}
        attendance={ev.attendance}
        variant="inline"
      />
      <div
        className={`mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ${compact ? "gap-2 sm:gap-3" : "gap-2 sm:gap-4"}`}
      >
        <div className="min-w-0 text-left">
          <div className={teamNameClass}>{ev.home_team}</div>
        </div>
        {showScore ? (
          <div className="flex flex-col items-center shrink-0">
            {isLive ? (
              <div className={`origin-center ${compact ? "scale-[0.7] sm:scale-90" : "scale-[0.8] sm:scale-100"}`}>
                <LiveScoreFlash
                  home={ev.home_score ?? live.currentHome}
                  away={ev.away_score ?? live.currentAway}
                />
              </div>
            ) : (
              <div className={staticScoreClass}>
                <span>{ev.home_score ?? 0}</span>
                <span className="px-2 sm:px-3 text-muted-foreground">–</span>
                <span>{ev.away_score ?? 0}</span>
              </div>
            )}
            {isLive && liveMinute !== null && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-live">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
                </span>
                <span className="font-mono tabular-nums">{liveMinute}'</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm shrink-0">vs</div>
        )}
        <div className="min-w-0 text-right">
          <div className={teamNameClass}>{ev.away_team}</div>
        </div>
      </div>
      <div className={`mt-4 max-w-full ${compact ? "" : "sm:max-w-xl sm:mx-auto"} space-y-3`}>
        <ProbBar
          homeLabel={ev.home_team}
          awayLabel={ev.away_team}
          home={probs.home}
          draw={probs.draw}
          away={probs.away}
        />
        {isPlayed && wpCurve.length >= 2 && (
          <div className="overflow-hidden w-full">
            <LiveHeaderSparkline points={wpCurve} />
          </div>
        )}
        {isPlayed &&
          (() => {
            const liveStats = parseLiveTeamStats(data.statistics);
            const useReal = !!liveStats;
            return (
              <div className="overflow-hidden w-full">
                <LiveXgRibbon
                  home={
                    useReal
                      ? liveStats!.home.expectedGoals
                      : (simulation.sim.lambdaHome * (liveMinute ?? 0)) / 90
                  }
                  away={
                    useReal
                      ? liveStats!.away.expectedGoals
                      : (simulation.sim.lambdaAway * (liveMinute ?? 0)) / 90
                  }
                  homeLabel={ev.home_team}
                  awayLabel={ev.away_team}
                />
              </div>
            );
          })()}

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 text-[11px]">
          <span className="font-mono tabular-nums text-muted-foreground min-w-0 truncate">
            {isPlayed ? "Residual xG" : "xG forecast"}{" "}
            <span className="text-foreground">
              {lambdaH.toFixed(2)} – {lambdaA.toFixed(2)}
            </span>
          </span>
          {isPlayed && (
            <>
              <span className="hidden sm:inline text-muted-foreground">·</span>
              <span className="font-mono tabular-nums text-muted-foreground min-w-0 truncate">
                State{" "}
                <span className="text-foreground">
                  {live.currentHome}-{live.currentAway}
                </span>{" "}
                @ <span className="text-foreground">{liveMinute ?? 0}'</span>
              </span>
            </>
          )}

          <span className="hidden sm:inline text-muted-foreground">·</span>
          {favored === "even" ? (
            <span className="text-muted-foreground min-w-0 truncate">Coin-flip · &lt; 4% edge</span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-primary min-w-0 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate">
                {isPlayed ? "Live edge" : "Favors"}{" "}
                <span className="font-semibold">
                  {favored === "home" ? ev.home_team : ev.away_team}
                </span>
              </span>
              <span className="font-mono tabular-nums shrink-0">{edgePct}%</span>
            </span>
          )}
          <span className="hidden sm:inline text-muted-foreground">·</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground col-span-2 sm:col-auto">
            {source === "market" ? "market-derived" : "model-derived"}
          </span>
        </div>
      </div>


    </div>
  );
}
