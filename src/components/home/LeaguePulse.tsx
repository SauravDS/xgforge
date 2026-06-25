import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { StandingsTable } from "@/components/series/StandingsTable";
import { getLeaguePulse, type LeaguePulse as LeaguePulseDTO } from "@/lib/bsd.functions";
import { popularityTier } from "@/lib/league-popularity";

export function LeaguePulse({ enabled = true }: { enabled?: boolean }) {
  const fetchPulse = useServerFn(getLeaguePulse);
  const q = useQuery({
    queryKey: ["league-pulse"],
    queryFn: () => fetchPulse({ data: { limit: 4 } }),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

  if (!enabled || q.isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-lg border border-border/60 bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  const leagues = (q.data?.leagues ?? [])
    .slice()
    .sort(
      (a, b) =>
        popularityTier(a.league_name, a.country) - popularityTier(b.league_name, b.country) ||
        a.league_name.localeCompare(b.league_name),
    );
  if (!leagues.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Standings unavailable right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {leagues.map((l) => (
        <LeagueCard key={l.league_id} pulse={l} />
      ))}
    </div>
  );
}

function LeagueCard({ pulse }: { pulse: LeaguePulseDTO }) {
  const { country, league_name, kind, phase, standings } = pulse;
  const kindLabel =
    kind === "international"
      ? "International"
      : kind === "club-continental"
        ? "Continental cup"
        : kind === "national-team"
          ? "National teams"
          : kind === "club-domestic"
            ? null
            : kind
              ? kind.replace(/-/g, " ")
              : null;
  return (
    <section className="rounded-lg border border-border/60 bg-card overflow-x-hidden md:overflow-hidden">
      <header className="px-4 py-3 border-b border-border/60 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{country}</span>
            {kindLabel && (
              <span className="rounded-sm border border-border/70 px-1.5 py-[1px] text-[9px] tracking-[0.16em] text-primary/80">
                {kindLabel}
              </span>
            )}
            {phase === "group" && (
              <span className="rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-[1px] text-[9px] tracking-[0.16em] text-primary">
                Group stage
              </span>
            )}
          </div>
          <h3 className="font-display text-xl leading-none mt-1">{league_name}</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground whitespace-nowrap">
          Top {standings.length}
        </span>
      </header>
      <div className="relative">
        <div className="overflow-x-auto md:overflow-visible scrollbar-none">
          <div className="min-w-[560px] md:min-w-0">
            <StandingsTable rows={standings.slice(0, 6)} />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent md:hidden"
        />
      </div>
    </section>
  );
}
