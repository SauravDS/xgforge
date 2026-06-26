import { useQuery, queryOptions } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FixtureCard } from "@/components/home/FixtureCard";
import { LeagueFilter } from "@/components/home/LeagueFilter";
import { LeaguePulse } from "@/components/home/LeaguePulse";
import { MiniMatchCenter } from "@/components/home/MiniMatchCenter";
import { RecentCard } from "@/components/home/RecentCard";
import { getHomeBundle, getHomeMiniBundle, type HomeBundleEvent } from "@/lib/bsd.functions";
import { getHomeEnrichments } from "@/lib/home-enrichments.functions";
import { sortByPopularity } from "@/lib/league-popularity";

// Shared query option objects so the loader and useQuery use the same cache key.
const homeMiniQueryOptions = queryOptions({
  queryKey: ["home-mini-bundle"],
  queryFn: () => getHomeMiniBundle({ data: { upcomingDays: 7, limit: 6 } }),
  staleTime: 30 * 1000,
});

const homeBundleQueryOptions = queryOptions({
  queryKey: ["home-bundle"],
  queryFn: () => getHomeBundle({ data: { upcomingDays: 7, recentHours: 48 } }),
  staleTime: 90 * 1000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "xG Forge — Football intelligence & Live xG" },
      {
        name: "description",
        content:
          "Scientific football analytics: live expected goals (xG), match simulations, player rankings, and market-edge insights.",
      },
      { property: "og:title", content: "xG Forge — Football intelligence & Live xG" },
      {
        property: "og:description",
        content:
          "Scientific football analytics: live expected goals (xG), match simulations, player rankings, and market-edge insights.",
      },
      { property: "og:url", content: "https://xgforge.in/" },
      { name: "twitter:title", content: "xG Forge — Football intelligence & Live xG" },
      { name: "twitter:description", content: "Scientific football analytics: live expected goals (xG), match simulations, player rankings, and market-edge insights." },
    ],
    links: [{ rel: "canonical", href: "https://xgforge.in/" }],
  }),
  // Kick off both fetches during navigation, before the component mounts.
  loader: ({ context: { queryClient } }) => {
    return Promise.all([
      queryClient.prefetchQuery(homeMiniQueryOptions),
      queryClient.prefetchQuery(homeBundleQueryOptions),
    ]);
  },
  component: Home,
});

const PER_RAIL = 4;

function Home() {
  const miniQ = useQuery({
    ...homeMiniQueryOptions,
    refetchInterval: (query) =>
      (query.state.data?.live?.length ?? 0) > 0 ? 30 * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const q = useQuery({
    ...homeBundleQueryOptions,
    enabled: miniQ.isSuccess || miniQ.isError,
    refetchInterval: (query) =>
      (query.state.data?.live?.length ?? 0) > 0 ? 30 * 1000 : 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const miniData = miniQ.data;
  const data = q.data;
  const liveAll = useMemo(() => sortByPopularity(data?.live ?? [], "live"), [data]);
  const upcomingAll = useMemo(
    () => sortByPopularity(data?.upcoming ?? [], "upcoming"),
    [data],
  );
  const recentAll = useMemo(() => sortByPopularity(data?.recent ?? [], "recent"), [data]);

  const liveCount = liveAll.length;

  const fetchEnrich = useServerFn(getHomeEnrichments);
  const upcomingForEnr = upcomingAll.slice(0, 12);
  const liveForEnr = liveAll.slice(0, 12);
  const recentForEnr = recentAll.slice(0, 12);
  const enr = useQuery({
    enabled: !!data,
    queryKey: [
      "home-enrichments",
      upcomingForEnr.map((e) => e.id).join(","),
      liveForEnr.map((e) => e.id).join(","),
      recentForEnr.map((e) => e.id).join(","),
    ],
    queryFn: () =>
      fetchEnrich({
        data: {
          upcomingIds: upcomingForEnr.map((e) => e.id),
          liveIds: liveForEnr.map((e) => e.id),
          recentIds: recentForEnr.map((e) => e.id),
          leagueIds: Array.from(
            new Set(
              [...upcomingForEnr, ...liveForEnr, ...recentForEnr].map((e) => e.league_id),
            ),
          ),
          eventTeams: [...liveForEnr, ...recentForEnr].map((e) => ({
            id: e.id,
            home: e.home_team_id,
            away: e.away_team_id,
          })),
        },
      }),
    staleTime: 90 * 1000,
    refetchInterval: liveCount > 0 ? 30 * 1000 : false,
  });
  const enrEvents = enr.data?.events ?? {};
  const enrTeams = enr.data?.teams ?? {};
  const railsLoading = !data && (miniQ.isLoading || q.isPending || q.isFetching);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-5 sm:py-8 space-y-8 sm:space-y-12">
        {q.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load match data: {(q.error as Error).message}
          </div>
        )}

        {miniQ.isLoading || (!miniData && q.isLoading) ? (
          <div className="h-56 rounded-xl border border-border/60 bg-card animate-pulse" />
        ) : miniData ? (
          <MiniMatchCenter
            live={miniData.live}
            upcoming={miniData.upcoming.length ? miniData.upcoming : upcomingAll}
            recent={miniData.recent?.length ? miniData.recent : recentAll}
            liveEnr={enrEvents}
          />
        ) : data ? (
          <MiniMatchCenter live={liveAll} upcoming={upcomingAll} recent={recentAll} liveEnr={enrEvents} />

        ) : null}



        <Rail
          id="upcoming"
          eyebrow="Fixtures"
          title="Upcoming"
          events={upcomingAll}
          seeAllTo="/upcoming"
          loading={railsLoading}
          empty="No upcoming fixtures."
          render={(ev) => (
            <FixtureCard
              key={ev.id}
              ev={ev}
              enr={enrEvents[String(ev.id)]}
              homeForm={enrTeams[String(ev.home_team_id)]}
              awayForm={enrTeams[String(ev.away_team_id)]}
            />
          )}
        />

        <Rail
          id="recent"
          eyebrow="Recent results"
          title="Last 48 hours"
          events={recentAll}
          seeAllTo="/recent"
          loading={railsLoading}
          empty="No finished matches in the last 48 hours."
          render={(ev) => <RecentCard key={ev.id} ev={ev} enr={enrEvents[String(ev.id)]} />}
        />

        <Section id="pulse" eyebrow="League pulse" title="Where the table stands">
          <LeaguePulse enabled={!!data} />
        </Section>
      </main>
    </div>
  );
}

function Rail({
  id,
  eyebrow,
  title,
  events,
  seeAllTo,
  loading,
  empty,
  render,
}: {
  id: string;
  eyebrow: string;
  title: string;
  events: HomeBundleEvent[];
  seeAllTo: "/live" | "/upcoming" | "/recent";
  loading: boolean;
  empty: string;
  render: (ev: HomeBundleEvent) => React.ReactNode;
}) {
  const [league, setLeague] = useState<number | null>(null);
  const filtered = league === null ? events : events.filter((e) => e.league_id === league);
  const shown = filtered.slice(0, PER_RAIL);

  return (
    <section id={id} className="scroll-mt-32">
      <header className="mb-4 flex items-end justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
            {eyebrow}
          </div>
          <h2 className="font-display text-2xl sm:text-4xl leading-none truncate">{title}</h2>
        </div>
        <Link
          to={seeAllTo}
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-primary hover:underline"
        >
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {events.length > 0 && (
        <div className="mb-4 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="min-w-max sm:min-w-0">
            <LeagueFilter events={events} value={league} onChange={setLeague} />
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonGrid rows={4} />
      ) : shown.length === 0 ? (
        <Empty message={league !== null ? "No matches for this league." : empty} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {shown.map(render)}
        </div>
      )}
    </section>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-32">
      <header className="mb-5">
        <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
          {eyebrow}
        </div>
        <h2 className="font-display text-2xl sm:text-4xl leading-none">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function SkeletonGrid({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-lg border border-border/60 bg-card animate-pulse"
        />
      ))}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
