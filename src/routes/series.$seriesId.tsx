import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { FixtureCard } from "@/components/home/FixtureCard";
import { LiveCard } from "@/components/home/LiveCard";
import { RecentCard } from "@/components/home/RecentCard";
import { StandingsTable } from "@/components/series/StandingsTable";
import { type HomeBundleEvent } from "@/lib/bsd.functions";
import { getHomeEnrichments } from "@/lib/home-enrichments.functions";
import { seriesViewQueryOptions } from "@/lib/list-queries";

export const Route = createFileRoute("/series/$seriesId")({
  head: ({ loaderData, params }) => {
    // @ts-ignore - loaderData type is inferred from loader
    const seriesName = loaderData?.league?.name ?? "Series";
    const title = `${seriesName} Fixtures & Standings — xG Forge`;
    const description = `Live scores, upcoming fixtures, and table standings for the ${seriesName}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `https://xgforge.in/series/${params.seriesId}` },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: `https://xgforge.in/series/${params.seriesId}` }],
    };
  },
  loader: async ({ context, params }) => {
    const leagueId = Number(params.seriesId);
    if (Number.isFinite(leagueId)) {
      return await context.queryClient.ensureQueryData(seriesViewQueryOptions(leagueId));
    }
  },
  component: SeriesDetail,
});

function SeriesDetail() {
  const { seriesId } = Route.useParams();
  const leagueId = Number(seriesId);

  const q = useQuery({
    ...seriesViewQueryOptions(leagueId),
    refetchInterval: (query) => ((query.state.data?.live?.length ?? 0) > 0 ? 30_000 : false),
    placeholderData: keepPreviousData,
  });


  const live: HomeBundleEvent[] = q.data?.live ?? [];
  const upcoming: HomeBundleEvent[] = q.data?.upcoming ?? [];
  const finished: HomeBundleEvent[] = q.data?.finished ?? [];
  const meta = q.data?.league;

  const fetchEnrich = useServerFn(getHomeEnrichments);
  const enr = useQuery({
    enabled: live.length + upcoming.length + finished.length > 0,
    queryKey: [
      "series-enr",
      leagueId,
      live.map((e) => e.id).join(","),
      upcoming.map((e) => e.id).join(","),
      finished.map((e) => e.id).join(","),
    ],
    queryFn: () =>
      fetchEnrich({
        data: {
          upcomingIds: upcoming.slice(0, 16).map((e) => e.id),
          liveIds: live.slice(0, 16).map((e) => e.id),
          recentIds: finished.slice(0, 16).map((e) => e.id),
          leagueIds: [leagueId],
          eventTeams: [...live, ...finished].slice(0, 24).map((e) => ({
            id: e.id,
            home: e.home_team_id,
            away: e.away_team_id,
          })),
        },
      }),
    staleTime: 60_000,
  });
  const enrEvents = enr.data?.events ?? {};
  const enrTeams = enr.data?.teams ?? {};

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <Link
          to="/series"
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Series
        </Link>
        <header>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {meta?.country || "International"}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-none">
            {meta?.name ?? "Competition"}
          </h1>
        </header>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            <SeriesRail
              hasStandings={(q.data?.standings?.length ?? 0) > 0}
              liveCount={live.length}
              upcomingCount={upcoming.length}
              recentCount={finished.length}
            />
            {(q.data?.standings?.length ?? 0) > 0 && (
              <section id="standings" className="scroll-mt-24">
                <header className="mb-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
                    {q.data?.standingsPhase === "group" ? "Group stage" : "Standings"}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl leading-none">Points table</h2>
                </header>
                <div className="rounded-lg border border-border/60 bg-card overflow-hidden overflow-x-auto">
                  <StandingsTable rows={q.data!.standings} />
                </div>
              </section>
            )}
            <Bucket id="live" eyebrow="In play" title="Live" empty="No live matches right now.">
              {live.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {live.map((ev) => (
                    <LiveCard key={ev.id} ev={ev} enr={enrEvents[String(ev.id)]} />
                  ))}
                </div>
              ) : null}
            </Bucket>

            <Bucket
              id="upcoming"
              eyebrow="Fixtures"
              title="Upcoming"
              empty="No upcoming fixtures in the next 14 days."
            >
              {upcoming.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {upcoming.map((ev) => (
                    <FixtureCard
                      key={ev.id}
                      ev={ev}
                      enr={enrEvents[String(ev.id)]}
                      homeForm={enrTeams[String(ev.home_team_id)]}
                      awayForm={enrTeams[String(ev.away_team_id)]}
                    />
                  ))}
                </div>
              ) : null}
            </Bucket>

            <Bucket
              id="recent"
              eyebrow="Results"
              title="Recent"
              empty="No finished matches in the last 14 days."
            >
              {finished.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {finished.map((ev) => (
                    <RecentCard key={ev.id} ev={ev} enr={enrEvents[String(ev.id)]} />
                  ))}
                </div>
              ) : null}
            </Bucket>
          </>
        )}

      </main>
    </div>
  );
}

function Bucket({
  id,
  eyebrow,
  title,
  empty,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="mb-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">{eyebrow}</div>
        <h2 className="font-display text-2xl sm:text-3xl leading-none">{title}</h2>
      </header>
      {children ?? (
        <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-6 text-center text-xs text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}

function SeriesRail({
  hasStandings,
  liveCount,
  upcomingCount,
  recentCount,
}: {
  hasStandings: boolean;
  liveCount: number;
  upcomingCount: number;
  recentCount: number;
}) {
  const items: { id: string; label: string; count?: number; dot?: boolean }[] = [];
  if (hasStandings) items.push({ id: "standings", label: "Points table" });
  items.push({ id: "live", label: "Live", count: liveCount, dot: liveCount > 0 });
  items.push({ id: "upcoming", label: "Upcoming", count: upcomingCount });
  items.push({ id: "recent", label: "Recent", count: recentCount });

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <nav className="sticky top-16 z-20 -mx-4 px-4 py-2 bg-background/85 backdrop-blur border-y border-border/60">
      <ul className="flex gap-1 overflow-x-auto no-scrollbar">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              onClick={(e) => onClick(e, it.id)}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground hover:border-primary/60 transition-colors"
            >
              {it.dot ? (
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              ) : null}
              <span>{it.label}</span>
              {typeof it.count === "number" ? (
                <span className="text-foreground/80 tabular-nums">{it.count}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

