import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FixtureCard } from "@/components/home/FixtureCard";
import { LeagueFilter } from "@/components/home/LeagueFilter";
import { getHomeEnrichments } from "@/lib/home-enrichments.functions";
import { upcomingListQueryOptions } from "@/lib/list-queries";

export const Route = createFileRoute("/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming fixtures — xG Forge" },
      {
        name: "description",
        content: "Football fixtures kicking off in the next 48 hours, ranked by popularity.",
      },
      { property: "og:title", content: "Upcoming fixtures — xG Forge" },
      {
        property: "og:description",
        content: "All football fixtures in the next 48 hours.",
      },
      { property: "og:url", content: "/upcoming" },
    ],
    links: [{ rel: "canonical", href: "/upcoming" }],
  }),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(upcomingListQueryOptions);
  },
  component: UpcomingPage,
});

function UpcomingPage() {
  const q = useQuery(upcomingListQueryOptions);
  const events = q.data?.events ?? [];


  const fetchEnrich = useServerFn(getHomeEnrichments);
  const enr = useQuery({
    enabled: events.length > 0,
    queryKey: ["upcoming-page-enr", events.map((e) => e.id).join(",")],
    queryFn: () =>
      fetchEnrich({
        data: {
          upcomingIds: events.slice(0, 16).map((e) => e.id),
          liveIds: [],
          recentIds: [],
          leagueIds: Array.from(new Set(events.map((e) => e.league_id))).slice(0, 20),
          eventTeams: [],
        },
      }),
    staleTime: 5 * 60_000,
  });
  const enrEvents = enr.data?.events ?? {};
  const enrTeams = enr.data?.teams ?? {};

  const [league, setLeague] = useState<number | null>(null);
  const filtered = league === null ? events : events.filter((e) => e.league_id === league);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-5 sm:py-8 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Home
        </Link>
        <header>
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Fixtures</div>
          <h1 className="font-display text-3xl sm:text-5xl leading-none">Upcoming · next 48h</h1>
        </header>

        <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="min-w-max sm:min-w-0">
            <LeagueFilter events={events} value={league} onChange={setLeague} />
          </div>
        </div>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            {events.length === 0 ? "No upcoming fixtures." : "No matches for this league."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((ev) => (
              <FixtureCard
                key={ev.id}
                ev={ev}
                enr={enrEvents[String(ev.id)]}
                homeForm={enrTeams[String(ev.home_team_id)]}
                awayForm={enrTeams[String(ev.away_team_id)]}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
