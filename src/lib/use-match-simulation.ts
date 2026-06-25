// Shared simulator hook. One Monte Carlo run per match, reused by the
// header probability bar AND the SimulatorPanel.
//
// `useLiveSimulation` upgrades the pre-match sim with the actual current
// score and minute, producing residual win-probabilities that update on
// every refetch.

import { useMemo } from "react";

import { computeLiveScore, liveTiltAt, residualProbs } from "@/lib/live-derive";
import { lambdasFromMarket, parse1X2, type MarketProbs } from "@/lib/odds";
import { lambdasFromModel, simulateMatch, type SimResult } from "@/lib/simulator";

export type MatchSimulation = {
  sim: SimResult;
  market: MarketProbs | null;
  source: "market" | "model";
};

export function useMatchSimulation(
  odds: unknown,
  modelHome: number,
  modelAway: number,
): MatchSimulation {
  const market = useMemo(() => parse1X2(odds), [odds]);
  const lambdas = useMemo(() => {
    if (market) return lambdasFromMarket(market);
    return lambdasFromModel(modelHome, modelAway);
  }, [market, modelHome, modelAway]);
  const sim = useMemo(
    () => simulateMatch(lambdas.lambdaHome, lambdas.lambdaAway, { runs: 5000 }),
    [lambdas.lambdaHome, lambdas.lambdaAway],
  );
  return { sim, market, source: market ? "market" : "model" };
}

export type LiveSimulation = {
  homeWin: number;
  draw: number;
  awayWin: number;
  remH: number;
  remA: number;
  currentHome: number;
  currentAway: number;
  minute: number;
};

/** In-play residual probabilities given the pre-match sim λ and the live state.
 *  When `statistics` is supplied, λ is tilted by live momentum + xG pace so the
 *  curve actually moves between goals. */
export function useLiveSimulation(
  base: MatchSimulation,
  incidents: unknown,
  liveMinute: number,
  homeTeamId: number | undefined,
  awayTeamId: number | undefined,
  scoreOverride?: { home: number | null; away: number | null },
  statistics?: unknown,
): LiveSimulation {
  return useMemo(() => {
    const derived = computeLiveScore(incidents, homeTeamId, awayTeamId);
    const currentHome =
      typeof scoreOverride?.home === "number" ? scoreOverride.home : derived.home;
    const currentAway =
      typeof scoreOverride?.away === "number" ? scoreOverride.away : derived.away;
    const minute = Math.max(0, Math.min(120, Math.round(liveMinute || 0)));
    const tilt = liveTiltAt(statistics, minute, base.sim.lambdaHome, base.sim.lambdaAway);
    const r = residualProbs(
      currentHome,
      currentAway,
      minute,
      base.sim.lambdaHome * tilt.homeMul,
      base.sim.lambdaAway * tilt.awayMul,
    );
    return {
      homeWin: r.home,
      draw: r.draw,
      awayWin: r.away,
      remH: r.remH,
      remA: r.remA,
      currentHome,
      currentAway,
      minute,
    };
  }, [base.sim.lambdaHome, base.sim.lambdaAway, incidents, liveMinute, homeTeamId, awayTeamId, scoreOverride?.home, scoreOverride?.away, statistics]);
}
