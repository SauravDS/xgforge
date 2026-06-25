import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { DivergingStatBar } from "@/components/charts/DivergingStatBar";
import { MomentumStrip } from "@/components/charts/MomentumStrip";
import { PossessionDonut } from "@/components/charts/PossessionDonut";
import { ProbBar } from "@/components/charts/ProbBar";
import { XgProgression } from "@/components/charts/XgProgression";
import { DisciplineRow } from "@/components/match/DisciplineRow";
import { DisciplineRiskCard } from "@/components/match/DisciplineRiskCard";
import { DoubtWatch } from "@/components/match/DoubtWatch";
import { FinishedPlayerTable } from "@/components/match/FinishedPlayerTable";
import { FormArc } from "@/components/match/FormArc";
import { FormCompare } from "@/components/match/FormCompare";
import { FormationMatchup } from "@/components/match/FormationMatchup";
import { GkWorkloadCard } from "@/components/match/GkWorkloadCard";
import { GoalsForecastBars } from "@/components/match/GoalsForecastBars";
import { HeadToHeadStrip } from "@/components/match/HeadToHeadStrip";
import { KeyDuels } from "@/components/match/KeyDuels";
import { LineupPitch } from "@/components/match/LineupPitch";
import { LiveHeaderSparkline } from "@/components/match/LiveHeaderSparkline";
import { LiveMatchHeaderBlock } from "@/components/match/LiveMatchHeaderBlock";
import { LiveRatings } from "@/components/match/LiveRatings";
import { LiveScoreFlash } from "@/components/match/LiveScoreFlash";
import { LiveSetPieceCard } from "@/components/match/LiveSetPieceCard";
import { LiveXgRibbon } from "@/components/match/LiveXgRibbon";
import { ManagerMatchup } from "@/components/match/ManagerMatchup";
import { MatchContextChips } from "@/components/match/MatchContextChips";
import { MatchPulseStrip } from "@/components/match/MatchPulseStrip";
import { MatchScriptChips } from "@/components/match/MatchScriptChips";
import { MatchTimeline } from "@/components/match/MatchTimeline";

import { MatchTimelineVertical } from "@/components/match/MatchTimelineVertical";
import { OddsVsModel } from "@/components/match/OddsVsModel";
import { PressureHeatStrip } from "@/components/match/PressureHeatStrip";
import { SetPieceThreat } from "@/components/match/SetPieceThreat";
import { ShotQualityStrip } from "@/components/match/ShotQualityStrip";
import { SimulatorPanel } from "@/components/match/SimulatorPanel";
import { SquadExplorer } from "@/components/match/SquadExplorer";
import { TacticalEdges } from "@/components/match/TacticalEdges";
import { TerritoryTempoCard } from "@/components/match/TerritoryTempoCard";
import { TopPlayersDeck } from "@/components/match/TopPlayersDeck";
import { VenueConditionsBar } from "@/components/match/VenueConditionsBar";

import { WinProbabilityLive } from "@/components/match/WinProbabilityLive";

import { getEventBundle } from "@/lib/bsd.functions";
import { queryOptions } from "@tanstack/react-query";

import {
  buildDisciplineRisk,
  buildGkWorkload,
  buildGoalDiffSeries,
  buildMatchScriptTags,
  computeLiveMinute,
  computeLiveRatings,
  computeWinProbCurve,
  computeWpSwings,
} from "@/lib/live-derive";
import {
  buildLiveStatsRows,
  buildPeriodXgPoints,
  buildPerMinuteXgPoints,
  formatRow,
  parseLiveTeamStats,
  type LiveStatsBundle,
} from "@/lib/match-stats";
import { parse1X2 } from "@/lib/odds";
import {
  buildModelXgPath,
  buildPressureBuckets,
  buildShotEvents,
  buildStatsFromIncidents,
  buildStatsGrid,
  buildTimeline,
  buildXgProgression,
  formatStat,
  type TimelineEvent,
} from "@/lib/match-derive";
import { isFinishedMatchStatus, isLiveMatchStatus } from "@/lib/match-status";
import { buildMatchRanking } from "@/lib/ranking-engine";
import { selectTacticalXI } from "@/lib/select-tactical-xi";
import {
  useLiveSimulation,
  useMatchSimulation,
  type MatchSimulation,
} from "@/lib/use-match-simulation";

// Shared queryOptions so the loader and useQuery hit the same cache slot.
const matchQueryOptions = (eventId: number) =>
  queryOptions({
    queryKey: ["event", String(eventId)],
    queryFn: () => getEventBundle({ data: { eventId } }),
    staleTime: 120 * 1000,
  });

export const Route = createFileRoute("/match/$eventId")({
  head: () => ({
    meta: [
      { title: "Match — xG Forge" },
      {
        name: "description",
        content:
          "xG Forge Rank Top 11, live xG progression, post-match analytics and match simulator for every fixture.",
      },
    ],
  }),
  // Fire the full data bundle fetch during navigation, before component mount.
  loader: ({ context: { queryClient }, params }) => {
    const id = Number(params.eventId);
    if (Number.isFinite(id)) {
      return queryClient.prefetchQuery(matchQueryOptions(id));
    }
  },
  component: MatchPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-xl font-semibold">Could not load this match</h1>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        <Link to="/" className="text-primary text-sm mt-4 inline-block">
          ← Back to matches
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-foreground p-10">
      <p>Match not found.</p>
    </div>
  ),
});

type Bundle = Awaited<ReturnType<typeof getEventBundle>>;

function MatchPage() {
  const { eventId } = Route.useParams();

  const q = useQuery({
    ...matchQueryOptions(Number(eventId)),
    refetchInterval: (query) => {
      const status = query.state.data?.event?.status;
      if (isLiveMatchStatus(status)) return 30 * 1000;
      const lineupStatus = query.state.data?.lineups?.lineup_status;
      if (lineupStatus && lineupStatus !== "confirmed") return 60 * 1000;
      return false;
    },
    refetchOnWindowFocus: true,
  });


  const ranking = useMemo(() => {
    if (!q.data) return null;
    return buildMatchRanking(
      q.data.lineups,
      q.data.prediction,
      q.data.playerForm,
      q.data.standings,
      {
        home_team: q.data.event?.home_team ?? "Home",
        away_team: q.data.event?.away_team ?? "Away",
      },
    );
  }, [q.data]);

  const status = q.data?.event?.status;
  const phase: "live" | "finished" | "upcoming" = isLiveMatchStatus(status)
    ? "live"
    : isFinishedMatchStatus(status)
      ? "finished"
      : "upcoming";

  // One simulation for the whole page — feeds both the header probability
  // bar and the SimulatorPanel below. When prediction probs are sparse the
  // simulator still produces meaningful numbers from market odds (when
  // present) or our fallback model lambdas.
  const modelHome = ranking?.context.home_strength ?? 0.45;
  const modelAway = ranking?.context.away_strength ?? 0.45;
  const simulation = useMatchSimulation(q.data?.odds ?? null, modelHome, modelAway);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← All matches
        </Link>

        {q.isLoading && (
          <div className="h-40 rounded-lg border border-border/60 bg-card animate-pulse" />
        )}

        {q.data && (
          <>
            <MatchHeader data={q.data} simulation={simulation} phase={phase} />

            {phase === "live" && (
              <LiveView
                data={q.data}
                isFetching={q.isFetching}
                onRefresh={() => q.refetch()}
                simulation={simulation}
              />
            )}
            {phase === "finished" && (
              <FinishedView data={q.data} ranking={ranking} simulation={simulation} />
            )}
            {phase === "upcoming" && (
              <UpcomingView
                data={q.data}
                ranking={ranking}
                simulation={simulation}
                isFetching={q.isFetching}
                onRefresh={() => q.refetch()}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────

function MatchHeader({
  data,
  simulation,
  phase,
}: {
  data: Bundle;
  simulation: MatchSimulation;
  phase: "live" | "finished" | "upcoming";
}) {
  const ev = data.event;
  if (!ev) return null;
  const kickoff = new Date(ev.event_date).toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <header className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-card p-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{kickoff}</span>
        <PhasePill phase={phase} />
      </div>
      <LiveMatchHeaderBlock data={data} simulation={simulation} phase={phase} />
    </header>
  );
}

function PhasePill({ phase }: { phase: "live" | "finished" | "upcoming" }) {
  if (phase === "live")
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-live/40 bg-live/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-live">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
        </span>
        Live
      </span>
    );
  if (phase === "finished")
    return (
      <span className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Full time
      </span>
    );
  return (
    <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-primary">
      Upcoming
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live & Finished — shared analytics blocks
// ─────────────────────────────────────────────────────────────────────────────

function StatsGrid({ data }: { data: Bundle }) {
  const ev = data.event;
  const apiRows = useMemo(() => buildStatsGrid(data.statistics), [data.statistics]);
  const derivedRows = useMemo(
    () =>
      buildStatsFromIncidents(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        ev?.home_score,
        ev?.away_score,
      ),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, ev?.home_score, ev?.away_score],
  );
  const usingFallback = apiRows.length === 0 && derivedRows.length > 0;
  const rows = apiRows.length > 0 ? apiRows : derivedRows;
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Match statistics will appear here when available.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <DivergingStatBar
            key={r.key}
            label={r.label}
            home={r.home}
            away={r.away}
            format={(n) => formatStat(n, r.format)}
          />
        ))}
      </div>
      {usingFallback && (
        <p className="text-[11px] italic text-muted-foreground">
          Live stats not yet published — derived from incidents.
        </p>
      )}
    </div>
  );
}

function XgPanel({
  data,
  modelPath,
  goalDiffSeries,
  liveMinute,
  periodPoints,
  perMinutePoints,
}: {
  data: Bundle;
  modelPath?: { minute: number; home: number; away: number }[];
  goalDiffSeries?: { minute: number; diff: number }[];
  liveMinute?: number;
  periodPoints?: { minute: number; home: number; away: number }[];
  perMinutePoints?: { minute: number; home: number; away: number }[];
}) {
  const ev = data.event;
  const incidentPoints = useMemo(
    () => buildXgProgression(data.incidents, ev?.home_team_id, ev?.away_team_id),
    [data.incidents, ev?.home_team_id, ev?.away_team_id],
  );
  const shots = useMemo(
    () => buildShotEvents(data.incidents, ev?.home_team_id, ev?.away_team_id),
    [data.incidents, ev?.home_team_id, ev?.away_team_id],
  );
  // Source priority: per-minute /stats/ xG_per_minute > incident-derived > period > model
  let mode: "perMinute" | "incidents" | "period" | "model" = "model";
  let points = modelPath ?? [];
  if (perMinutePoints && perMinutePoints.length >= 2) {
    points = perMinutePoints;
    mode = "perMinute";
  } else if (incidentPoints.length >= 2) {
    points = incidentPoints;
    mode = "incidents";
  } else if (periodPoints && periodPoints.length >= 2) {
    points = periodPoints;
    mode = "period";
  }
  const last = points[points.length - 1];
  const sotHome = shots.filter((s) => s.team === "home" && (s.isGoal || s.xg > 0.05)).length;
  const sotAway = shots.filter((s) => s.team === "away" && (s.isGoal || s.xg > 0.05)).length;
  const sourceLabel =
    mode === "perMinute"
      ? "xG · per-minute live feed"
      : mode === "incidents" || mode === "period"
        ? "xG · live feed"
        : "xG · model";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-tight">
          xG progression
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground ml-2">
            {sourceLabel}
          </span>
        </h3>
        {last && (
          <div className="text-[11px] font-mono text-muted-foreground tabular-nums">
            <span className="text-chart-1">{last.home.toFixed(2)}</span>
            <span className="px-1.5">·</span>
            <span className="text-chart-2">{last.away.toFixed(2)}</span>
          </div>
        )}
      </div>
      <XgProgression
        points={points}
        shots={shots}
        modelPath={mode === "model" ? modelPath : undefined}
        goalDiffSeries={goalDiffSeries}
        liveMinute={liveMinute}
        homeLabel={ev?.home_team ?? "Home"}
        awayLabel={ev?.away_team ?? "Away"}
      />
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span>
          <span className="text-chart-1">{ev?.home_team ?? "Home"}</span>{" "}
          <span className="font-mono text-foreground tabular-nums normal-case tracking-normal">
            {shots.filter((s) => s.team === "home").length} shots · {sotHome} SoT
          </span>
        </span>
        {mode === "model" && (
          <span className="italic normal-case tracking-normal text-[10px]">
            Live xG not yet published — showing modeled expected path
          </span>
        )}
        <span>
          <span className="font-mono text-foreground tabular-nums normal-case tracking-normal">
            {shots.filter((s) => s.team === "away").length} shots · {sotAway} SoT
          </span>{" "}
          <span className="text-chart-2">{ev?.away_team ?? "Away"}</span>
        </span>
      </div>
    </div>
  );
}

function PossessionPanel({ data }: { data: Bundle }) {
  const rows = useMemo(() => buildStatsGrid(data.statistics), [data.statistics]);
  const poss = rows.find((r) => r.key === "possession" || r.key === "ball_possession");
  if (!poss) return null;
  return (
    <PossessionDonut
      home={poss.home}
      away={poss.away}
      homeLabel={data.event?.home_team ?? "Home"}
      awayLabel={data.event?.away_team ?? "Away"}
    />
  );
}

function MomentumPanel({ data, liveMinute }: { data: Bundle; liveMinute?: number }) {
  const ev = data.event;
  const shots = useMemo(
    () => buildShotEvents(data.incidents, ev?.home_team_id, ev?.away_team_id),
    [data.incidents, ev?.home_team_id, ev?.away_team_id],
  );
  const pressure = useMemo(
    () =>
      buildPressureBuckets(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        Math.max(liveMinute ?? 0, 45),
        5,
      ),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, liveMinute],
  );
  return (
    <MomentumStrip
      shots={shots}
      pressure={pressure}
      matchMinute={Math.max(liveMinute ?? 0, 90)}
      homeLabel={ev?.home_team ?? "Home"}
      awayLabel={ev?.away_team ?? "Away"}
    />
  );
}

function BulletTimeline({ data }: { data: Bundle }) {
  const events = useMemo(
    () => buildTimeline(data.incidents, data.event?.home_team_id, data.event?.away_team_id),
    [data.incidents, data.event?.home_team_id, data.event?.away_team_id],
  );
  if (!events.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Match incidents will appear here as they happen.
      </div>
    );
  }
  return (
    <ol className="relative space-y-2 border-l border-border/60 pl-4">
      {events.map((e, i) => (
        <BulletTimelineRow key={i} ev={e} />
      ))}
    </ol>
  );
}

function BulletTimelineRow({ ev }: { ev: TimelineEvent }) {
  if (ev.kind === "period") {
    return (
      <li className="relative -ml-4 pl-0">
        <span className="absolute -left-[21px] top-2.5 h-2.5 w-2.5 rounded-full bg-border" />
        <div className="flex items-center gap-2 my-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            {ev.label}
            {ev.minute > 0 && ` · ${ev.minute}'`}
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
      </li>
    );
  }
  const dot = ev.team === "home" ? "bg-chart-1" : ev.team === "away" ? "bg-chart-2" : "bg-muted";
  const alignRight = ev.team === "away";
  const cardSquare =
    ev.kind === "card_yellow"
      ? "bg-yellow-400"
      : ev.kind === "card_red" || ev.kind === "card_second_yellow"
        ? "bg-rose-500"
        : null;
  const isSub = ev.kind === "substitution";
  return (
    <li className="relative">
      <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
      <div
        className={`flex items-center gap-3 text-sm ${alignRight ? "flex-row-reverse text-right" : ""}`}
      >
        <span className="font-mono text-xs text-muted-foreground tabular-nums w-9">
          {ev.minute}'
        </span>
        {cardSquare && (
          <span className={`inline-block h-3 w-2.5 rounded-[1px] ${cardSquare}`} aria-hidden />
        )}
        <span className="font-semibold">
          {isSub ? "⇅" : null} {ev.label}
        </span>
        {isSub && (ev.playerIn || ev.playerOut) ? (
          <span className="text-xs text-muted-foreground truncate">
            {ev.playerIn && <span className="text-emerald-300">↑ {ev.playerIn}</span>}
            {ev.playerIn && ev.playerOut && <span className="px-1">·</span>}
            {ev.playerOut && <span className="text-rose-300">↓ {ev.playerOut}</span>}
          </span>
        ) : (
          ev.player && (
            <span className="text-muted-foreground text-xs truncate">
              {ev.player}
              {ev.assist && <span className="opacity-70"> · assist {ev.assist}</span>}
            </span>
          )
        )}
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live view
// ─────────────────────────────────────────────────────────────────────────────

function MatchAnalyticsView({
  data,
  simulation,
  isLive,
  isFetching = false,
  onRefresh,
}: {
  data: Bundle;
  simulation: MatchSimulation;
  isLive: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
}) {
  const ev = data.event;
  const homeTeam = ev?.home_team ?? "Home";
  const awayTeam = ev?.away_team ?? "Away";
  const liveMinute = useMemo(
    () =>
      computeLiveMinute(data.incidents, ev?.event_date, ev?.status, ev?.current_minute) ??
      (isLive ? 0 : 90),
    [data.incidents, ev?.event_date, ev?.status, ev?.current_minute, isLive],
  );
  // Real /stats/ payload (typed)
  const liveStats: LiveStatsBundle | null = useMemo(
    () => parseLiveTeamStats(data.statistics),
    [data.statistics],
  );
  const wpCurve = useMemo(
    () =>
      computeWinProbCurve(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        simulation.sim.lambdaHome,
        simulation.sim.lambdaAway,
        liveMinute,
      ),
    [
      data.incidents,
      ev?.home_team_id,
      ev?.away_team_id,
      simulation.sim.lambdaHome,
      simulation.sim.lambdaAway,
      liveMinute,
    ],
  );
  const swings = useMemo(
    () => computeWpSwings(wpCurve, data.incidents, ev?.home_team_id, ev?.away_team_id),
    [wpCurve, data.incidents, ev?.home_team_id, ev?.away_team_id],
  );
  const ratings = useMemo(
    () =>
      computeLiveRatings(
        data.incidents,
        data.lineups,
        ev?.home_team_id,
        ev?.away_team_id,
        liveMinute,
        liveStats,
        data.playerStats,
      ),
    [
      data.incidents,
      data.lineups,
      ev?.home_team_id,
      ev?.away_team_id,
      liveMinute,
      liveStats,
      data.playerStats,
    ],
  );
  const hasLineups = !!(data.lineups?.lineups?.home || data.lineups?.lineups?.away);
  const modelXgPath = useMemo(
    () =>
      buildModelXgPath(
        simulation.sim.lambdaHome,
        simulation.sim.lambdaAway,
        Math.max(liveMinute, 90),
      ),
    [simulation.sim.lambdaHome, simulation.sim.lambdaAway, liveMinute],
  );
  const perMinuteXg = useMemo(() => buildPerMinuteXgPoints(data.statistics), [data.statistics]);
  const periodXgPoints = useMemo(
    () => (liveStats ? buildPeriodXgPoints(liveStats, liveMinute) : undefined),
    [liveStats, liveMinute],
  );
  const goalDiff = useMemo(
    () =>
      buildGoalDiffSeries(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        Math.max(liveMinute, 90),
      ),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, liveMinute],
  );
  const timelineEvents = useMemo(
    () => buildTimeline(data.incidents, ev?.home_team_id, ev?.away_team_id),
    [data.incidents, ev?.home_team_id, ev?.away_team_id],
  );
  const pressure = useMemo(
    () =>
      buildPressureBuckets(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        Math.max(liveMinute, 45),
        5,
      ),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, liveMinute],
  );
  const discipline = useMemo(
    () => buildDisciplineRisk(data.incidents, ev?.home_team_id, ev?.away_team_id, liveMinute),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, liveMinute],
  );
  const gkWork = useMemo(
    () => buildGkWorkload(data.incidents, data.lineups, ev?.home_team_id, ev?.away_team_id),
    [data.incidents, data.lineups, ev?.home_team_id, ev?.away_team_id],
  );
  const scriptTags = useMemo(
    () =>
      buildMatchScriptTags(data.incidents, wpCurve, ev?.home_team_id, ev?.away_team_id, liveMinute),
    [data.incidents, wpCurve, ev?.home_team_id, ev?.away_team_id, liveMinute],
  );

  const liveRows = useMemo(() => (liveStats ? buildLiveStatsRows(liveStats) : null), [liveStats]);
  const derivedStats = useMemo(
    () =>
      buildStatsFromIncidents(
        data.incidents,
        ev?.home_team_id,
        ev?.away_team_id,
        ev?.home_score,
        ev?.away_score,
      ),
    [data.incidents, ev?.home_team_id, ev?.away_team_id, ev?.home_score, ev?.away_score],
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">
          {isLive ? "Live analytics" : "Full-time analytics"}
        </h2>
        {isLive && onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded border border-border/60 px-2.5 py-1.5 hover:bg-surface-2/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        )}
      </div>

      <HeadToHeadStrip h2h={data.h2h} homeLabel={homeTeam} awayLabel={awayTeam} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <WinProbabilityLive
            points={wpCurve}
            homeLabel={homeTeam}
            awayLabel={awayTeam}
            swings={swings}
          />
        </section>
        {liveStats && (
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <MatchPulseStrip stats={liveStats} homeLabel={homeTeam} awayLabel={awayTeam} />
          </section>
        )}
      </div>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold tracking-tight">Timeline</h3>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {timelineEvents.length} events
          </span>
        </div>
        <MatchTimelineVertical
          events={timelineEvents}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          liveMinute={liveMinute}
          isLive={isLive}
        />
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold tracking-tight">Match stats</h3>
        {liveRows ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {liveRows.map((r) => {
                const fmt = formatRow(r);
                const preferLower =
                  r.key === "fouls" ||
                  r.key === "yellows" ||
                  r.key === "reds" ||
                  r.key === "offsides";
                return (
                  <DivergingStatBar
                    key={r.key}
                    label={r.label}
                    home={r.home}
                    away={r.away}
                    prefer={preferLower ? "lower" : "higher"}
                    format={(n) => (n === r.home ? fmt.home : n === r.away ? fmt.away : String(n))}
                  />
                );
              })}
            </div>
            <ShotQualityStrip
              home={liveStats!.home}
              away={liveStats!.away}
              homeLabel={homeTeam}
              awayLabel={awayTeam}
            />
          </>
        ) : derivedStats.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {derivedStats.map((r) => (
                <DivergingStatBar
                  key={r.key}
                  label={r.label}
                  home={r.home}
                  away={r.away}
                  format={(n) => formatStat(n, r.format)}
                />
              ))}
            </div>
            <p className="text-[11px] italic text-muted-foreground">
              {isLive
                ? "Live stats not yet published — derived from incidents."
                : "Stats derived from incidents."}
            </p>
          </>
        ) : (
          <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
            Match statistics will appear here when available.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <XgPanel
          data={data}
          modelPath={modelXgPath}
          goalDiffSeries={goalDiff}
          liveMinute={liveMinute}
          periodPoints={periodXgPoints}
          perMinutePoints={perMinuteXg ?? undefined}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {liveStats && (
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <TerritoryTempoCard stats={liveStats} homeLabel={homeTeam} awayLabel={awayTeam} />
          </section>
        )}
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <PressureHeatStrip buckets={pressure} homeLabel={homeTeam} awayLabel={awayTeam} />
        </section>
      </div>

      <section className="rounded-xl border border-border/60 bg-card p-5">
        <h3 className="text-sm font-semibold tracking-tight mb-3">
          {isLive ? "Live player ratings" : "Final player ratings"}
        </h3>
        <LiveRatings
          ratings={ratings}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          hasLineups={hasLineups}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <DisciplineRiskCard
            risk={discipline}
            homeLabel={homeTeam}
            awayLabel={awayTeam}
            referee={data.referee}
          />
        </section>
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <LiveSetPieceCard
            homeCorners={liveStats?.home.cornerKicks ?? 0}
            awayCorners={liveStats?.away.cornerKicks ?? 0}
            homeFouls={liveStats?.home.fouls ?? 0}
            awayFouls={liveStats?.away.fouls ?? 0}
            home={liveStats?.home}
            away={liveStats?.away}
            homeLabel={homeTeam}
            awayLabel={awayTeam}
          />
        </section>
        {(isLive ||
          gkWork.home.shotsFaced +
            gkWork.away.shotsFaced +
            gkWork.home.goalsConceded +
            gkWork.away.goalsConceded >
            0) && (
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <GkWorkloadCard workload={gkWork} homeLabel={homeTeam} awayLabel={awayTeam} />
          </section>
        )}
      </div>

      {scriptTags.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <MatchScriptChips tags={scriptTags} />
        </section>
      )}

      <LineupPitch
        lineups={data.lineups}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        playerForm={data.playerForm}
        isFetching={isFetching}
        onRefresh={onRefresh ?? (() => {})}
      />
    </>
  );
}

function LiveView({
  data,
  isFetching,
  onRefresh,
  simulation,
}: {
  data: Bundle;
  isFetching: boolean;
  onRefresh: () => void;
  simulation: MatchSimulation;
}) {
  return (
    <MatchAnalyticsView
      data={data}
      simulation={simulation}
      isLive
      isFetching={isFetching}
      onRefresh={onRefresh}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finished view
// ─────────────────────────────────────────────────────────────────────────────

function FinishedView({
  data,
  ranking,
  simulation,
}: {
  data: Bundle;
  ranking: ReturnType<typeof buildMatchRanking> | null;
  simulation: MatchSimulation;
}) {
  return (
    <>
      <MatchAnalyticsView data={data} simulation={simulation} isLive={false} />
      {ranking?.status === "ok" && (
        <FinishedPlayerTable ranking={ranking} playerForm={data.playerForm} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming view (existing functionality, preserved)
// ─────────────────────────────────────────────────────────────────────────────

function UpcomingView({
  data,
  ranking,
  simulation,
  isFetching,
  onRefresh,
}: {
  data: Bundle;
  ranking: ReturnType<typeof buildMatchRanking> | null;
  simulation: MatchSimulation;
  isFetching: boolean;
  onRefresh: () => void;
}) {
  const homeTeam = data.event?.home_team ?? "Home";
  const awayTeam = data.event?.away_team ?? "Away";

  const tactical = useMemo(() => selectTacticalXI(data.lineups), [data.lineups]);

  // Captain/vice (per side) = top projection from ranking, restricted to
  // players present in the resolved lineup. Falls back to undefined when
  // lineup is unavailable.
  const { captainHome, viceHome, captainAway, viceAway } = useMemo(() => {
    if (!ranking || ranking.status !== "ok")
      return { captainHome: null, viceHome: null, captainAway: null, viceAway: null };
    const home = ranking.top11
      .filter((p) => p.team_side === "home")
      .sort((a, b) => b.projection - a.projection);
    const away = ranking.top11
      .filter((p) => p.team_side === "away")
      .sort((a, b) => b.projection - a.projection);
    return {
      captainHome: home[0]?.id ?? null,
      viceHome: home[1]?.id ?? null,
      captainAway: away[0]?.id ?? null,
      viceAway: away[1]?.id ?? null,
    };
  }, [ranking]);

  return (
    <>
      <MatchContextChips event={data.event} venue={data.venue} />

      {tactical.source && (
        <FormationMatchup
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeFormation={tactical.homeFormation}
          awayFormation={tactical.awayFormation}
        />
      )}


      <LineupPitch
        lineups={data.lineups}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        playerForm={data.playerForm}
        playerDetail={data.playerDetail}
        isFetching={isFetching}
        onRefresh={onRefresh}
        captainHomeId={captainHome}
        viceHomeId={viceHome}
        captainAwayId={captainAway}
        viceAwayId={viceAway}
      />

      <DoubtWatch
        lineups={data.lineups}
        playerDetail={data.playerDetail ?? {}}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
      />

      <SimulatorPanel homeTeam={homeTeam} awayTeam={awayTeam} simulation={simulation} />

      <GoalsForecastBars sim={simulation.sim} homeTeam={homeTeam} awayTeam={awayTeam} />

      <TacticalEdges
        source={tactical.source}
        homePlayers={tactical.home}
        awayPlayers={tactical.away}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        playerForm={data.playerForm}
      />

      {tactical.source && (
        <KeyDuels
          homePlayers={tactical.home}
          awayPlayers={tactical.away}
          playerForm={data.playerForm}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      )}

      {tactical.source && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SetPieceThreat
            homePlayers={tactical.home}
            awayPlayers={tactical.away}
            playerForm={data.playerForm}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
          <DisciplineRow
            homePlayers={tactical.home}
            awayPlayers={tactical.away}
            playerForm={data.playerForm}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            lineups={data.lineups}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FormArc
          homeTeamId={data.event?.home_team_id}
          awayTeamId={data.event?.away_team_id}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          standings={data.standings}
        />
        <FormCompare
          homeTeamId={data.event?.home_team_id}
          awayTeamId={data.event?.away_team_id}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          standings={data.standings}
        />
      </div>

      {ranking?.status === "ok" && (
        <>
          <TopPlayersDeck
            ranking={ranking}
            playerForm={data.playerForm}
            playerDetail={data.playerDetail}
            playerCareer={data.playerCareer}
          />
          <ManagerMatchup
            home={data.managers?.home ?? null}
            away={data.managers?.away ?? null}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
          />
          <SquadExplorer ranking={ranking} playerForm={data.playerForm} />
        </>
      )}
    </>
  );
}
