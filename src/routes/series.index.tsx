import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { type SeriesListItem } from "@/lib/bsd.functions";
import { matchPremiumLeague } from "@/lib/league-scope";
import { popularityTier } from "@/lib/league-popularity";
import { seriesIndexQueryOptions } from "@/lib/list-queries";

export const Route = createFileRoute("/series/")({
  head: () => ({
    meta: [
      { title: "Series — xG Forge" },
      {
        name: "description",
        content:
          "Ongoing football competitions — international tournaments and country-by-country leagues.",
      },
      { property: "og:title", content: "Series — xG Forge" },
      {
        property: "og:description",
        content: "Browse every ongoing football competition.",
      },
      { property: "og:url", content: "/series" },
    ],
    links: [{ rel: "canonical", href: "/series" }],
  }),
  loader: ({ context }) => {
    return context.queryClient.prefetchQuery(seriesIndexQueryOptions);
  },
  component: SeriesIndex,
});

function isInternational(s: SeriesListItem): boolean {
  const m = matchPremiumLeague({
    id: s.id,
    name: s.name,
    country: s.country,
    is_women: false,
    is_active: true,
    current_season: null,
  });
  if (m?.kind === "international") return true;
  const c = (s.country ?? "").trim().toLowerCase();
  return c === "" || c === "international" || c === "world";
}

function SeriesIndex() {
  const q = useQuery(seriesIndexQueryOptions);



  const { internationalGroup, countryGroups } = useMemo(() => {
    const series = q.data?.series ?? [];
    const intl: SeriesListItem[] = [];
    const rest: SeriesListItem[] = [];
    for (const s of series) {
      if (isInternational(s)) intl.push(s);
      else rest.push(s);
    }
    intl.sort(
      (a, b) =>
        popularityTier(a.name, a.country) - popularityTier(b.name, b.country) ||
        a.name.localeCompare(b.name),
    );

    const byCountry = new Map<string, SeriesListItem[]>();
    for (const s of rest) {
      const key = s.country || "Other";
      if (!byCountry.has(key)) byCountry.set(key, []);
      byCountry.get(key)!.push(s);
    }
    const countries = [...byCountry.keys()].sort((a, b) => a.localeCompare(b));
    return {
      internationalGroup: intl,
      countryGroups: countries.map((c) => ({
        country: c,
        leagues: byCountry
          .get(c)!
          .slice()
          .sort(
            (a, b) =>
              popularityTier(a.name, a.country) - popularityTier(b.name, b.country) ||
              a.name.localeCompare(b.name),
          ),
      })),
    };
  }, [q.data]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-10">
        <header>
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
            Competitions
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-none">Series</h1>
        </header>

        {q.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : internationalGroup.length === 0 && countryGroups.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
            No ongoing competitions right now.
          </div>
        ) : (
          <div className="space-y-10">
            {internationalGroup.length > 0 && (
              <section>
                <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
                  Global
                </div>
                <h2 className="font-display text-2xl sm:text-3xl leading-none mb-4">
                  International tournaments
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {internationalGroup.map((l) => (
                    <SeriesTile key={l.id} item={l} />
                  ))}
                </div>
              </section>
            )}

            {countryGroups.length > 0 && (
              <div className="space-y-8">
                {countryGroups.map((g) => (
                  <section key={g.country}>
                    <h2 className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                      {g.country}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {g.leagues.map((l) => (
                        <SeriesTile key={l.id} item={l} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function SeriesTile({ item }: { item: SeriesListItem }) {
  return (
    <Link
      to="/series/$seriesId"
      params={{ seriesId: String(item.id) }}
      className="group block rounded-lg border border-border/60 bg-card hover:border-primary/50 transition-colors p-4"
    >
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {item.country || "International"}
      </div>
      <div className="font-display text-xl mt-1 leading-tight group-hover:text-primary transition-colors">
        {item.name}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2">
        Tier {item.tier} · {item.eventCount} fixtures
      </div>
    </Link>
  );
}
