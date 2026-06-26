import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { LeagueFilter } from "@/components/home/LeagueFilter";
import { RecentCard } from "@/components/home/RecentCard";
import { getHomeEnrichments } from "@/lib/home-enrichments.functions";
import { recentListQueryOptions } from "@/lib/list-queries";

export const Route = createFileRoute("/recent")({
  head: () => ({
    meta: [
      { title: "Recent Results & Match Analytics — xG Forge" },
      {
        name: "description",
        content: "Post-match analytics, xG timelines, and shot maps for recently finished football matches.",
      },
      { property: "og:title", content: "Recent Results & Match Analytics — xG Forge" },
      {
        property: "og:description",
        content: "Post-match analytics, xG timelines, and shot maps for recently finished football matches.",
      },
      { property: "og:url", content: "https://xgforge.in/recent" },
      { name: "twitter:title", content: "Recent Results & Match Analytics — xG Forge" },
      { name: "twitter:description", content: "Post-match analytics, xG timelines, and shot maps for recently finished football matches." },
    ],
    links: [{ rel: "canonical", href: "https://xgforge.in/recent" }],
  }),
  loader: ({ context }) => {
    return context.queryClient.prefetchQuery(recentListQueryOptions);
  },
  component: RecentPage,
});

function RecentPage() {
  const q = useQuery(recentListQueryOptions);
  const events = q.data?.events ?? [];


  const fetchEnrich = useServerFn(getHomeEnrichments);
  const enr = useQuery({
    enabled: events.length > 0,
    queryKey: ["recent-page-enr", events.map((e) => e.id).join(",")],
    queryFn: () =>
      fetchEnrich({
        data: {
          upcomingIds: [],
          liveIds: [],
          recentIds: events.slice(0, 16).map((e) => e.id),
          leagueIds: [],
          eventTeams: events.slice(0, 16).map((e) => ({
            id: e.id,
            home: e.home_team_id,
            away: e.away_team_id,
          })),
        },
      }),
    staleTime: 5 * 60_000,
  });
  const enrEvents = enr.data?.events ?? {};

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
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">Results</div>
          <h1 className="font-display text-3xl sm:text-5xl leading-none">Recent · last 48h</h1>
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
            {events.length === 0
              ? "No finished matches in the last 48 hours."
              : "No matches for this league."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((ev) => (
              <RecentCard key={ev.id} ev={ev} enr={enrEvents[String(ev.id)]} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
