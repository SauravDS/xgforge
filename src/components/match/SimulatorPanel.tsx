import { ProbBar } from "@/components/charts/ProbBar";
import { ScorelineMatrix } from "@/components/charts/ScorelineMatrix";
import { MarketBoard } from "@/components/match/MarketBoard";
import type { MatchSimulation } from "@/lib/use-match-simulation";

export function SimulatorPanel({
  homeTeam,
  awayTeam,
  simulation,
}: {
  homeTeam: string;
  awayTeam: string;
  simulation: MatchSimulation;
}) {
  const { sim, market, source } = simulation;

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl tracking-tight">Match simulator</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            5,000 Monte Carlo runs · Poisson goals from{" "}
            {source === "market" ? "market-derived" : "model-derived"} expectancies (λ
            <span className="font-mono ml-1">
              {sim.lambdaHome.toFixed(2)}–{sim.lambdaAway.toFixed(2)}
            </span>
            )
          </p>
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          xG · {sim.expHomeGoals.toFixed(2)} – {sim.expAwayGoals.toFixed(2)}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 p-5">
        <div>
          <ProbBar
            homeLabel={homeTeam}
            awayLabel={awayTeam}
            home={sim.homeWin}
            draw={sim.draw}
            away={sim.awayWin}
          />
          <div className="mt-5">
            <MarketBoard sim={sim} market={market} homeTeam={homeTeam} awayTeam={awayTeam} />
          </div>
        </div>

        <div>
          <ScorelineMatrix
            lambdaHome={sim.lambdaHome}
            lambdaAway={sim.lambdaAway}
            homeLabel={homeTeam.split(" ")[0]?.slice(0, 8) ?? "H"}
            awayLabel={awayTeam.split(" ")[0]?.slice(0, 8) ?? "A"}
          />
        </div>
      </div>
    </section>
  );
}
