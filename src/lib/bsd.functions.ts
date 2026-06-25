import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { bsdFetch } from "./bsd-client.server";
import type {
  BsdEventLineups,
  BsdEventListItem,
  BsdH2H,
  BsdLeague,
  BsdManager,
  BsdOdds,
  BsdPaginated,
  BsdPlayerCareer,
  BsdPlayerDetail,
  BsdPrediction,
  BsdRefereeInfo,
  BsdVenueInfo,
  Json,
} from "./bsd-types";

import { pickPremiumLeagues, type PremiumLeague } from "./league-scope";
import { popularityTier, sortByPopularity, type PopRail } from "./league-popularity";
import { isLiveMatchStatus, LIVE_EVENT_STATUSES } from "./match-status";

// ---- Leagues ----------------------------------------------------------------

export const listLeagues = createServerFn({ method: "GET" }).handler(async () => {
  const data = await bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", {
    limit: 200,
  });
  // Only active leagues, sorted alphabetically by country then name.
  const leagues = data.results
    .filter((l) => l.is_active && !l.is_women)
    .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  return { leagues };
});

// ---- Upcoming events --------------------------------------------------------

const upcomingInput = z.object({
  leagueId: z.number().optional(),
  days: z.number().min(1).max(14).default(7),
});

export const listUpcomingEvents = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => upcomingInput.parse(input))
  .handler(async ({ data }) => {
    const now = new Date();
    const end = new Date(now.getTime() + data.days * 24 * 60 * 60 * 1000);
    const result = await bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
      date_from: now.toISOString(),
      date_to: end.toISOString(),
      status: "notstarted",
      league_id: data.leagueId,
      limit: 100,
    });
    const events = result.results.slice().sort((a, b) => a.event_date.localeCompare(b.event_date));
    return { events, count: result.count };
  });

// ---- Home dashboard bundle (live + upcoming-premium + recent) ---------------

const homeBundleInput = z
  .object({
    upcomingDays: z.number().min(1).max(14).default(7),
    recentHours: z.number().min(6).max(168).default(48),
  })
  .default({ upcomingDays: 7, recentHours: 48 });

export type PremiumLeagueDTO = {
  id: number;
  name: string;
  country: string;
  priority: number;
  kind: string;
  key: string;
  label: string;
};

export type HomeBundleEvent = BsdEventListItem & {
  league_name?: string;
  league_country?: string;
  league_priority?: number;
  league_kind?: string;
};

export const getHomeBundle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => homeBundleInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const now = new Date();
    const upcomingEnd = new Date(now.getTime() + data.upcomingDays * 86400000);
    const recentStart = new Date(now.getTime() - data.recentHours * 3600000);

    const liveWindowStart = new Date(now.getTime() - 4 * 3600000);
    const liveWindowEnd = new Date(now.getTime() + 30 * 60000);
    const liveStatusQueries = LIVE_EVENT_STATUSES.filter((status) => status !== "extra_time");
    const liveJobs = [
      ...liveStatusQueries.map((status) =>
        bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
          status,
          limit: 80,
        }),
      ),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: liveWindowStart.toISOString(),
        date_to: liveWindowEnd.toISOString(),
        limit: 200,
      }),
    ];

    // Fetch leagues + event windows in parallel. BSD does not expose every
    // live fixture as `inprogress`; FIFA fixtures currently use `1st_half` /
    // `2nd_half`, so liveJobs queries each concrete in-play state.
    const [leaguesRes, upcoming, liveSettled, recent] = await Promise.allSettled([
      bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", { limit: 250 }),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: now.toISOString(),
        date_to: upcomingEnd.toISOString(),
        status: "notstarted",
        limit: 200,
      }),
      Promise.allSettled(liveJobs),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: recentStart.toISOString(),
        date_to: now.toISOString(),
        status: "finished",
        limit: 80,
      }),
    ]);

    const leagues =
      leaguesRes.status === "fulfilled"
        ? leaguesRes.value.results.filter((l) => l.is_active && !l.is_women)
        : [];

    const leaguesById = new Map<number, (typeof leagues)[number]>(leagues.map((l) => [l.id, l]));
    const premium = pickPremiumLeagues(leagues, now);
    const premiumById = new Map<number, PremiumLeague>(premium.map((p) => [p.id, p]));

    const decorate = (ev: BsdEventListItem): HomeBundleEvent => {
      const m = premiumById.get(ev.league_id);
      const l = leaguesById.get(ev.league_id);
      return {
        ...ev,
        league_name: m?.name ?? l?.name,
        league_country: m?.country ?? l?.country,
        league_priority: m?.priority,
        league_kind: m?.matcher.kind,
      };
    };

    const rankAll = (list: BsdEventListItem[], rail: PopRail) =>
      sortByPopularity(list.map(decorate), rail, now);

    const liveResults: BsdEventListItem[] = [];
    const liveErrors: string[] = [];
    if (liveSettled.status === "fulfilled") {
      const seen = new Set<number>();
      for (const r of liveSettled.value) {
        if (r.status === "rejected") {
          liveErrors.push(String(r.reason));
          continue;
        }
        for (const ev of r.value.results ?? []) {
          if (!isLiveMatchStatus(ev.status) || seen.has(ev.id)) continue;
          seen.add(ev.id);
          liveResults.push(ev);
        }
      }
    } else {
      liveErrors.push(String(liveSettled.reason));
    }

    const premiumDTO: PremiumLeagueDTO[] = premium.map((p) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      priority: p.priority,
      kind: p.matcher.kind,
      key: p.matcher.key,
      label: p.matcher.label,
    }));

    return {
      now: now.toISOString(),
      premiumLeagues: premiumDTO,
      upcoming: upcoming.status === "fulfilled" ? rankAll(upcoming.value.results, "upcoming") : [],
      live: rankAll(liveResults, "live"),
      recent: recent.status === "fulfilled" ? rankAll(recent.value.results, "recent") : [],
      errors: {
        leagues: leaguesRes.status === "rejected" ? String(leaguesRes.reason) : null,
        upcoming: upcoming.status === "rejected" ? String(upcoming.reason) : null,
        live: liveErrors.length ? liveErrors.join(" | ") : null,
        recent: recent.status === "rejected" ? String(recent.reason) : null,
      },
    };
  });

// Fast above-the-fold slice for the homepage mini match center. It checks the
// live window first and only asks for upcoming fixtures when no live match is
// available, so live headers paint without waiting for the full homepage bundle.
const homeMiniBundleInput = z
  .object({
    upcomingDays: z.number().min(1).max(14).default(7),
    limit: z.number().min(1).max(12).default(6),
  })
  .default({ upcomingDays: 7, limit: 6 });

export const getHomeMiniBundle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => homeMiniBundleInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const now = new Date();
    const liveWindowStart = new Date(now.getTime() - 8 * 3600_000);
    const liveWindowEnd = new Date(now.getTime() + 60 * 60_000);
    const [leaguesRes, liveWindowRes] = await Promise.allSettled([
      bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", { limit: 250 }),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: liveWindowStart.toISOString(),
        date_to: liveWindowEnd.toISOString(),
        limit: 250,
      }),
    ]);

    const leagues =
      leaguesRes.status === "fulfilled"
        ? leaguesRes.value.results.filter((l) => l.is_active && !l.is_women)
        : [];
    const leaguesById = new Map<number, (typeof leagues)[number]>(leagues.map((l) => [l.id, l]));
    const premium = pickPremiumLeagues(leagues, now);
    const premiumById = new Map<number, PremiumLeague>(premium.map((p) => [p.id, p]));

    const decorate = (ev: BsdEventListItem): HomeBundleEvent => {
      const m = premiumById.get(ev.league_id);
      const l = leaguesById.get(ev.league_id);
      return {
        ...ev,
        league_name: m?.name ?? l?.name,
        league_country: m?.country ?? l?.country,
        league_priority: m?.priority,
        league_kind: m?.matcher.kind,
      };
    };

    const collectLive = (items: BsdEventListItem[]) => {
      const seen = new Set<number>();
      const out: BsdEventListItem[] = [];
      for (const ev of items) {
        if (!isLiveMatchStatus(ev.status) || seen.has(ev.id)) continue;
        seen.add(ev.id);
        out.push(ev);
      }
      return out;
    };

    const liveResults =
      liveWindowRes.status === "fulfilled" ? collectLive(liveWindowRes.value.results ?? []) : [];

    if (liveResults.length > 0) {
      return {
        now: now.toISOString(),
        live: sortByPopularity(liveResults.map(decorate), "live", now).slice(0, data.limit),
        upcoming: [],
        recent: [],
        errors: {
          leagues: leaguesRes.status === "rejected" ? String(leaguesRes.reason) : null,
          live: liveWindowRes.status === "rejected" ? String(liveWindowRes.reason) : null,
        },
      };
    }

    const upcomingEnd = new Date(now.getTime() + data.upcomingDays * 86400_000);
    const recentStart = new Date(now.getTime() - 48 * 3600_000);
    const [upcomingRes, recentRes] = await Promise.allSettled([
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: now.toISOString(),
        date_to: upcomingEnd.toISOString(),
        status: "notstarted",
        limit: 80,
      }),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: recentStart.toISOString(),
        date_to: now.toISOString(),
        status: "finished",
        limit: 80,
      }),
    ]);

    return {
      now: now.toISOString(),
      live: [],
      upcoming: sortByPopularity(
        (upcomingRes.status === "fulfilled" ? upcomingRes.value.results : []).map(decorate),
        "upcoming",
        now,
      ).slice(0, data.limit),
      recent: sortByPopularity(
        (recentRes.status === "fulfilled" ? recentRes.value.results : []).map(decorate),
        "recent",
        now,
      ).slice(0, data.limit),
      errors: {
        leagues: leaguesRes.status === "rejected" ? String(leaguesRes.reason) : null,
        live: liveWindowRes.status === "rejected" ? String(liveWindowRes.reason) : null,
      },
    };
  });


// ---- Category list (full lists for /live, /upcoming, /recent) -------------

const categoryListInput = z.object({
  kind: z.enum(["live", "upcoming", "recent"]),
  hours: z.number().min(1).max(168).default(48),
});

export const getCategoryList = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => categoryListInput.parse(input))
  .handler(async ({ data }) => {
    const now = new Date();
    const windowMs = data.hours * 3600_000;

    const leaguesPromise = bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", {
      limit: 250,
    });

    let eventsPromise: Promise<BsdEventListItem[]>;
    if (data.kind === "live") {
      const liveStatusQueries = LIVE_EVENT_STATUSES.filter((s) => s !== "extra_time");
      const jobs = [
        ...liveStatusQueries.map((status) =>
          bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
            status,
            limit: 200,
          }),
        ),
        bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
          date_from: new Date(now.getTime() - 4 * 3600_000).toISOString(),
          date_to: new Date(now.getTime() + 30 * 60_000).toISOString(),
          limit: 250,
        }),
      ];
      eventsPromise = Promise.allSettled(jobs).then((settled) => {
        const seen = new Set<number>();
        const out: BsdEventListItem[] = [];
        for (const r of settled) {
          if (r.status !== "fulfilled") continue;
          for (const ev of r.value.results ?? []) {
            if (!isLiveMatchStatus(ev.status) || seen.has(ev.id)) continue;
            seen.add(ev.id);
            out.push(ev);
          }
        }
        return out;
      });
    } else if (data.kind === "upcoming") {
      eventsPromise = bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: now.toISOString(),
        date_to: new Date(now.getTime() + windowMs).toISOString(),
        status: "notstarted",
        limit: 250,
      }).then((r) => r.results);
    } else {
      eventsPromise = bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        date_from: new Date(now.getTime() - windowMs).toISOString(),
        date_to: now.toISOString(),
        status: "finished",
        limit: 250,
      }).then((r) => r.results);
    }

    const [leaguesRes, evRes] = await Promise.allSettled([leaguesPromise, eventsPromise]);
    const leagues =
      leaguesRes.status === "fulfilled"
        ? leaguesRes.value.results.filter((l) => l.is_active && !l.is_women)
        : [];
    const leaguesById = new Map<number, (typeof leagues)[number]>(leagues.map((l) => [l.id, l]));
    const premium = pickPremiumLeagues(leagues, now);
    const premiumById = new Map<number, PremiumLeague>(premium.map((p) => [p.id, p]));

    const evs = evRes.status === "fulfilled" ? evRes.value : [];
    const decorated: HomeBundleEvent[] = evs.map((ev) => {
      const m = premiumById.get(ev.league_id);
      const l = leaguesById.get(ev.league_id);
      return {
        ...ev,
        league_name: m?.name ?? l?.name,
        league_country: m?.country ?? l?.country,
        league_priority: m?.priority,
        league_kind: m?.matcher.kind,
      };
    });

    return {
      now: now.toISOString(),
      events: sortByPopularity(decorated, data.kind as PopRail, now),
    };
  });

// ---- Series (ongoing competitions) ----------------------------------------

export type SeriesListItem = {
  id: number;
  name: string;
  country: string;
  tier: number;
  eventCount: number;
};

export const getOngoingSeries = createServerFn({ method: "GET" }).handler(async () => {
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 86400_000);
  const future = new Date(now.getTime() + 30 * 86400_000);

  const [leaguesRes, evRes] = await Promise.allSettled([
    bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", { limit: 250 }),
    bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
      date_from: past.toISOString(),
      date_to: future.toISOString(),
      limit: 500,
    }),
  ]);

  const leagues =
    leaguesRes.status === "fulfilled"
      ? leaguesRes.value.results.filter((l) => l.is_active && !l.is_women)
      : [];
  const leaguesById = new Map<number, (typeof leagues)[number]>(leagues.map((l) => [l.id, l]));

  const counts = new Map<number, number>();
  if (evRes.status === "fulfilled") {
    for (const ev of evRes.value.results) {
      counts.set(ev.league_id, (counts.get(ev.league_id) ?? 0) + 1);
    }
  }

  const { popularityTier } = await import("./league-popularity");
  const series: SeriesListItem[] = [];
  for (const [leagueId, eventCount] of counts) {
    const l = leaguesById.get(leagueId);
    if (!l) continue;
    series.push({
      id: l.id,
      name: l.name,
      country: l.country,
      tier: popularityTier(l.name, l.country),
      eventCount,
    });
  }
  return { series };
});

// ---- Series view (live + upcoming + finished for one league) --------------

const seriesViewInput = z.object({ leagueId: z.number() });

export const getSeriesView = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => seriesViewInput.parse(input))
  .handler(async ({ data }) => {
    const now = new Date();
    // Use a broad window up-front so league details, events, and standings
    // can all be fetched in parallel. The league_id filter scopes events to
    // the right competition regardless of date range. We refine the window
    // client-side / via the second pagination call only when needed.
    const PAGE = 500;
    const broadPast = new Date(now.getTime() - 180 * 86400_000);
    const broadFuture = new Date(now.getTime() + 180 * 86400_000);

    const [leagueSettled, firstPageSettled, standingsSettled] = await Promise.allSettled([
      bsdFetch<BsdLeague>(`/api/v2/leagues/${data.leagueId}/`),
      bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        league_id: data.leagueId,
        date_from: broadPast.toISOString(),
        date_to: broadFuture.toISOString(),
        limit: PAGE,
      }),
      fetchLeagueStandingsRows(data.leagueId),
    ]);

    const league = leagueSettled.status === "fulfilled" ? leagueSettled.value : null;
    const firstPage = firstPageSettled.status === "fulfilled" ? firstPageSettled.value : null;
    const standingsRes =
      standingsSettled.status === "fulfilled"
        ? standingsSettled.value
        : { rows: [], phase: "knockout" as const };

    let evs: BsdEventListItem[] = firstPage?.results ?? [];
    // Only paginate a second page when the league truly exceeds PAGE fixtures.
    if (firstPage && firstPage.count > PAGE) {
      const secondPage = await bsdFetch<BsdPaginated<BsdEventListItem>>("/api/v2/events/", {
        league_id: data.leagueId,
        date_from: broadPast.toISOString(),
        date_to: broadFuture.toISOString(),
        limit: PAGE,
        offset: PAGE,
      }).catch(() => null);
      if (secondPage?.results?.length) evs = [...evs, ...secondPage.results];
    }

    const decorate = (ev: BsdEventListItem): HomeBundleEvent => ({
      ...ev,
      league_name: league?.name,
      league_country: league?.country,
    });

    const live: HomeBundleEvent[] = [];
    const upcoming: HomeBundleEvent[] = [];
    const finished: HomeBundleEvent[] = [];
    for (const raw of evs) {
      const ev = decorate(raw);
      if (isLiveMatchStatus(ev.status)) live.push(ev);
      else if (ev.status === "finished") finished.push(ev);
      else upcoming.push(ev);
    }
    upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date));
    finished.sort((a, b) => b.event_date.localeCompare(a.event_date));
    live.sort((a, b) => a.event_date.localeCompare(b.event_date));

    return {
      league: league ? { id: league.id, name: league.name, country: league.country } : null,
      live,
      upcoming,
      finished,
      standings: standingsRes.rows,
      standingsPhase: standingsRes.phase,
    };
  });


// ---- Featured headline (single event WP + last incidents) -----------------

const featuredInput = z.object({ eventId: z.number() });

function isObjH(v: unknown): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function pickNumH(o: Record<string, Json> | undefined, keys: string[]): number | null {
  if (!o) return null;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace("%", "").trim());
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export type HeadlineProb = { home: number; draw: number; away: number };
export type HeadlineIncident = {
  minute: number;
  type: string;
  side: "home" | "away" | null;
  text: string;
};

export const getMatchHeadline = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => featuredInput.parse(input))
  .handler(async ({ data }) => {
    const [predRes, incRes] = await Promise.allSettled([
      bsdFetch<Json>(`/api/v2/events/${data.eventId}/prediction/`),
      bsdFetch<Json>(`/api/v2/events/${data.eventId}/incidents/`),
    ]);

    let prob: HeadlineProb | null = null;
    if (predRes.status === "fulfilled" && isObjH(predRes.value)) {
      const roots: Record<string, Json>[] = [predRes.value];
      for (const k of [
        "outcome",
        "match_result",
        "result",
        "winner",
        "probabilities",
        "probs",
        "1x2",
        "one_x_two",
      ]) {
        const v = predRes.value[k];
        if (isObjH(v)) roots.push(v);
      }
      for (const r of roots) {
        const h = pickNumH(r, ["prob_home", "home_win", "home", "1"]);
        const d = pickNumH(r, ["prob_draw", "draw", "x", "X"]);
        const a = pickNumH(r, ["prob_away", "away_win", "away", "2"]);
        if (h !== null && d !== null && a !== null) {
          const t = h + d + a;
          if (t > 0) {
            prob =
              t > 1.5 ? { home: h / t, draw: d / t, away: a / t } : { home: h, draw: d, away: a };
            break;
          }
        }
      }
    }

    const incList: HeadlineIncident[] = [];
    if (incRes.status === "fulfilled") {
      const root = incRes.value;
      const arr = Array.isArray(root)
        ? root
        : isObjH(root) && Array.isArray(root.incidents)
          ? (root.incidents as Json[])
          : isObjH(root) && Array.isArray(root.results)
            ? (root.results as Json[])
            : [];
      for (const raw of arr) {
        if (!isObjH(raw)) continue;
        const minute = pickNumH(raw, ["minute", "time", "match_minute"]) ?? 0;
        const type = String(raw.type ?? raw.kind ?? raw.incident_type ?? "event");
        const sideStr = (raw.side as string | undefined)?.toLowerCase();
        const side: "home" | "away" | null =
          sideStr === "home" || sideStr === "away" ? sideStr : null;
        const player = String(raw.player ?? raw.player_name ?? raw.name ?? "");
        incList.push({
          minute,
          type,
          side,
          text: player ? `${type} · ${player}` : type,
        });
      }
    }
    incList.sort((a, b) => b.minute - a.minute);

    return { prob, incidents: incList.slice(0, 2) };
  });

// ---- League pulse (standings for top N premium leagues) --------------------

const leaguePulseInput = z
  .object({ limit: z.number().min(1).max(8).default(4) })
  .default({ limit: 4 });

export type PulseStandingRow = {
  rank: number;
  team_id: number;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
  xgf: number | null;
  xga: number | null;
  form: string | null; // e.g. "WWDLW"
};

export type LeaguePulse = {
  league_id: number;
  league_name: string;
  country: string;
  kind: string;
  priority: number;
  phase: "league" | "group" | "knockout";
  standings: PulseStandingRow[];
};

type RawStanding = {
  team_id?: number;
  team_name?: string;
  rank?: number;
  position?: number;
  played?: number;
  matches_played?: number;
  won?: number;
  wins?: number;
  drawn?: number;
  draws?: number;
  lost?: number;
  losses?: number;
  gf?: number;
  goals_for?: number;
  ga?: number;
  goals_against?: number;
  gd?: number;
  goal_difference?: number;
  points?: number;
  xgf?: number | null;
  xga?: number | null;
  form?: string | null;
  group?: string | null;
  group_name?: string | null;
};

function mapRawStanding(r: RawStanding, i: number): PulseStandingRow {
  const won = r.won ?? r.wins ?? 0;
  const drawn = r.drawn ?? r.draws ?? 0;
  const lost = r.lost ?? r.losses ?? 0;
  const gf = r.gf ?? r.goals_for ?? 0;
  const ga = r.ga ?? r.goals_against ?? 0;
  return {
    rank: r.rank ?? r.position ?? i + 1,
    team_id: r.team_id ?? 0,
    team_name: r.team_name ?? "—",
    played: r.played ?? r.matches_played ?? won + drawn + lost,
    won,
    drawn,
    lost,
    gf,
    ga,
    gd: r.gd ?? r.goal_difference ?? gf - ga,
    points: r.points ?? won * 3 + drawn,
    xgf: r.xgf ?? null,
    xga: r.xga ?? null,
    form: r.form ?? null,
  };
}

async function fetchLeagueStandingsRows(
  leagueId: number,
): Promise<{ rows: PulseStandingRow[]; phase: "league" | "group" | "knockout" }> {
  // Try the default standings endpoint first.
  try {
    const st = await bsdFetch<{ standings: RawStanding[] }>(
      `/api/v2/leagues/${leagueId}/standings/`,
    );
    const raw = st.standings ?? [];
    if (raw.length > 0) {
      return { rows: raw.map(mapRawStanding), phase: "league" };
    }
  } catch {
    // fall through to group attempt
  }
  // Group-stage fallback (FIFA / Euro group phase). Try the `?stage=group`
  // query first, then the dedicated `/groups/` endpoint. Either may return
  // either a flat `standings` array (with a `group` field on each row) or
  // an array of `{ group, standings }` blocks. We handle both shapes.
  type GroupBlock = { group?: string; name?: string; standings?: RawStanding[] };
  type GroupResp = { standings?: RawStanding[]; groups?: GroupBlock[] } | GroupBlock[] | null;

  const tryGroup = async (path: string, query?: Record<string, string>): Promise<RawStanding[]> => {
    try {
      const res = (await bsdFetch<GroupResp>(path, query)) ?? null;
      if (!res) return [];
      if (Array.isArray(res)) {
        // Array of group blocks
        const out: RawStanding[] = [];
        for (const block of res) {
          const g = block.group ?? block.name ?? "";
          for (const row of block.standings ?? []) {
            out.push({ ...row, group: row.group ?? g });
          }
        }
        return out;
      }
      if (Array.isArray(res.groups)) {
        const out: RawStanding[] = [];
        for (const block of res.groups) {
          const g = block.group ?? block.name ?? "";
          for (const row of block.standings ?? []) {
            out.push({ ...row, group: row.group ?? g });
          }
        }
        return out;
      }
      if (Array.isArray(res.standings)) return res.standings;
      return [];
    } catch {
      return [];
    }
  };

  let groupRaw = await tryGroup(`/api/v2/leagues/${leagueId}/standings/`, {
    stage: "group",
  });
  if (groupRaw.length === 0) {
    groupRaw = await tryGroup(`/api/v2/leagues/${leagueId}/groups/`);
  }
  if (groupRaw.length === 0) {
    return { rows: [], phase: "knockout" };
  }
  // Sort by (group, rank) and prefix team name with the group letter.
  groupRaw.sort((a, b) => {
    const ga = a.group ?? a.group_name ?? "";
    const gb = b.group ?? b.group_name ?? "";
    if (ga !== gb) return ga.localeCompare(gb);
    return (a.rank ?? a.position ?? 0) - (b.rank ?? b.position ?? 0);
  });
  const rows = groupRaw.map((r, i) => {
    const row = mapRawStanding(r, i);
    const g = r.group ?? r.group_name;
    if (g) row.team_name = `${g} · ${row.team_name}`;
    return row;
  });
  return { rows, phase: "group" };
}

export const getLeaguePulse = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => leaguePulseInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const now = new Date();
    const leaguesRes = await bsdFetch<BsdPaginated<BsdLeague>>("/api/v2/leagues/", {
      limit: 250,
    });
    const leagues = leaguesRes.results.filter((l) => l.is_active && !l.is_women);
    // Widen the pool — include every premium league (FIFA, UEFA national-team,
    // continental cups, domestic). Tournaments without a real table fall back
    // to group standings; remaining ones surface as knockout-phase cards.
    const allPremium = pickPremiumLeagues(leagues, now);
    // Pin tier-1/2 internationals so they aren't bumped out of the candidate
    // pool by club leagues fetched first.
    const tier1Intl = allPremium.filter(
      (p) => p.matcher.kind === "international" && popularityTier(p.name, p.country) <= 2,
    );
    const rest = allPremium.filter((p) => !tier1Intl.includes(p));
    const premium = [...tier1Intl, ...rest].slice(0, data.limit * 3);

    const results = await Promise.allSettled(
      premium.map(async (p) => {
        const { rows, phase } = await fetchLeagueStandingsRows(p.id);
        const pulse: LeaguePulse = {
          league_id: p.id,
          league_name: p.name,
          country: p.country,
          kind: p.matcher.kind,
          priority: p.priority,
          phase,
          standings: rows.slice(0, phase === "group" ? 24 : 6),
        };
        return pulse;
      }),
    );

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<LeaguePulse> => r.status === "fulfilled")
      .map((r) => r.value)
      // Standings-only: a card must have a real points table. Tournaments
      // with no league/group table (e.g. knockout phase) are skipped so
      // FIFA / Euro / Copa appear automatically while group standings exist
      // and drop off once they move to knockouts.
      .filter((p) => p.standings.length > 0);


    fulfilled.sort(
      (a, b) =>
        popularityTier(a.league_name, a.country) - popularityTier(b.league_name, b.country) ||
        a.priority - b.priority ||
        a.league_name.localeCompare(b.league_name),
    );

    return {
      leagues: fulfilled.slice(0, data.limit),
      errors: results
        .map((r, i) =>
          r.status === "rejected" ? { league: premium[i]?.name, reason: String(r.reason) } : null,
        )
        .filter(Boolean),
    };
  });

// ---- Event detail bundle ----------------------------------------------------

const eventInput = z.object({ eventId: z.number() });

type RawPlayerStatRow = {
  player_id: number;
  event_id: number;
  minutes_played: number | null;
  rating: number | null;
  goals: number | null;
  goal_assist: number | null;
  expected_goals: number | null;
  expected_assists: number | null;
  total_shots: number | null;
  shots_on_target: number | null;
  key_pass: number | null;
  total_tackle: number | null;
  won_tackle: number | null;
  interception: number | null;
  saves: number | null;
  goals_conceded: number | null;
  yellow_card: number | null;
  red_card: number | null;
  total_cross: number | null;
  accurate_cross: number | null;
  aerial_won: number | null;
  aerial_lost: number | null;
  total_contest: number | null;
  won_contest: number | null;
  was_fouled: number | null;
};

type StandingsRow = {
  team_id: number;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  xgf: number | null;
  xga: number | null;
  form: string | null;
};

export type PlayerFormMap = Record<string, RawPlayerStatRow[]>;
export type StandingsMap = Record<string, StandingsRow>;
export type PlayerDetailMap = Record<string, BsdPlayerDetail>;
export type PlayerCareerMap = Record<string, BsdPlayerCareer>;

// Raw shapes from BSD that we pass through as JSON.
export type BsdIncidents = Json;
export type BsdStatistics = Json;

export const getEventBundle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventInput.parse(input))
  .handler(async ({ data }) => {
    const { eventId } = data;
    // Drop the /h2h/ call — event.head_to_head carries the same payload.
    const [event, lineups, prediction, odds, incidents, statistics, playerStats] =
      await Promise.allSettled([
        bsdFetch<BsdEventListItem & { weather?: Json; attendance?: number | null; head_to_head?: BsdH2H | null }>(
          `/api/v2/events/${eventId}/`,
        ),
        bsdFetch<BsdEventLineups>(`/api/v2/events/${eventId}/lineups/`),
        bsdFetch<BsdPrediction>(`/api/v2/events/${eventId}/prediction/`),
        bsdFetch<BsdOdds>(`/api/v2/events/${eventId}/odds/`),
        bsdFetch<BsdIncidents>(`/api/v2/events/${eventId}/incidents/`),
        bsdFetch<BsdStatistics>(`/api/v2/events/${eventId}/stats/`),
        bsdFetch<Json>(`/api/v2/events/${eventId}/player-stats/`),
      ]);

    const eventVal = event.status === "fulfilled" ? event.value : null;
    const lineupsVal = lineups.status === "fulfilled" ? lineups.value : null;

    // --- Build player list from lineups (needed for wave 2 player jobs) ----
    type SidedPlayer = { id: number; ai: number; isStarter: boolean; side: "home" | "away" };
    const playerIds = new Set<number>();
    const sidedPlayers: SidedPlayer[] = [];
    if (lineupsVal?.lineups) {
      for (const side of ["home", "away"] as const) {
        const team = lineupsVal.lineups[side];
        if (!team) continue;
        for (const p of team.players) {
          playerIds.add(p.id);
          sidedPlayers.push({ id: p.id, ai: Number(p.ai_score ?? 0), isStarter: true, side });
        }
        for (const p of team.substitutes) {
          playerIds.add(p.id);
          sidedPlayers.push({ id: p.id, ai: Number(p.ai_score ?? 0), isStarter: false, side });
        }
      }
    }

    // Career arcs — bounded to the top 2 starters by ai_score on each side
    const topPerSide = (side: "home" | "away") =>
      sidedPlayers
        .filter((p) => p.side === side)
        .sort((a, b) => {
          if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
          return b.ai - a.ai;
        })
        .slice(0, 2)
        .map((p) => p.id);
    const careerIds = [...new Set([...topPerSide("home"), ...topPerSide("away")])];

    // IDs needed for secondary fetches
    const refereeId = (eventVal as { referee_id?: number | null } | null)?.referee_id ?? null;
    const venueId = eventVal?.venue_id ?? null;
    const homeCoachId = eventVal?.home_coach_id ?? null;
    const awayCoachId = eventVal?.away_coach_id ?? null;
    const leagueId = eventVal?.league_id ?? null;

    // -----------------------------------------------------------------------
    // Wave 2: ALL remaining work fires in ONE parallel round
    // (referee, venue, managers, player stats+details, career, standings)
    // -----------------------------------------------------------------------
    const [
      refereeRes,
      venueRes,
      homeMgrRes,
      awayMgrRes,
      formSettled,
      detailSettled,
      careerSettled,
      standingsRaw,
    ] = await Promise.all([
      // Referee / venue / managers
      Promise.allSettled([
        refereeId
          ? bsdFetch<BsdRefereeInfo>(`/api/v2/referees/${refereeId}/`)
          : Promise.resolve(null as BsdRefereeInfo | null),
      ]),
      Promise.allSettled([
        venueId
          ? bsdFetch<BsdVenueInfo>(`/api/v2/venues/${venueId}/`)
          : Promise.resolve(null as BsdVenueInfo | null),
      ]),
      Promise.allSettled([
        homeCoachId
          ? bsdFetch<BsdManager>(`/api/v2/managers/${homeCoachId}/`)
          : Promise.resolve(null as BsdManager | null),
      ]),
      Promise.allSettled([
        awayCoachId
          ? bsdFetch<BsdManager>(`/api/v2/managers/${awayCoachId}/`)
          : Promise.resolve(null as BsdManager | null),
      ]),
      // Player form stats
      Promise.allSettled(
        [...playerIds].map(async (pid) => {
          const res = await bsdFetch<BsdPaginated<RawPlayerStatRow>>(
            `/api/v2/players/${pid}/stats/`,
            { limit: 20 },
          );
          return [String(pid), res.results] as [string, RawPlayerStatRow[]];
        }),
      ),
      // Player detail
      Promise.allSettled(
        [...playerIds].map(async (pid) => {
          const res = await bsdFetch<BsdPlayerDetail>(`/api/v2/players/${pid}/`);
          return [String(pid), res] as [string, BsdPlayerDetail];
        }),
      ),
      // Career arcs (top 2 per side)
      Promise.allSettled(
        careerIds.map(async (pid) => {
          const res = await bsdFetch<BsdPlayerCareer>(`/api/v2/players/${pid}/career/`);
          return [String(pid), res] as [string, BsdPlayerCareer];
        }),
      ),
      // League standings — nice-to-have, degrade gracefully
      leagueId
        ? bsdFetch<{ standings: StandingsRow[] }>(
            `/api/v2/leagues/${leagueId}/standings/`,
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    // Unwrap the single-element allSettled arrays for referee/venue/managers
    const refRes = refereeRes[0];
    const venRes = venueRes[0];
    const hmRes = homeMgrRes[0];
    const amRes = awayMgrRes[0];

    // Build playerForm
    const playerForm: PlayerFormMap = {};
    for (const r of formSettled) {
      if (r.status === "fulfilled") {
        const [pid, rows] = r.value;
        playerForm[pid] = rows;
      }
    }

    // Build playerDetail
    const playerDetail: PlayerDetailMap = {};
    for (const r of detailSettled) {
      if (r.status === "fulfilled") {
        const [pid, det] = r.value;
        playerDetail[pid] = det;
      }
    }

    // Build playerCareer
    const playerCareer: PlayerCareerMap = {};
    for (const r of careerSettled) {
      if (r.status === "fulfilled") {
        const [pid, career] = r.value;
        playerCareer[pid] = career;
      }
    }

    // Build standings
    const standings: StandingsMap = {};
    for (const row of standingsRaw?.standings ?? []) {
      standings[String(row.team_id)] = row;
    }

    return {
      event: eventVal,
      eventError: event.status === "rejected" ? String(event.reason) : null,
      lineups: lineupsVal,
      lineupsError: lineups.status === "rejected" ? String(lineups.reason) : null,
      prediction: prediction.status === "fulfilled" ? prediction.value : null,
      predictionError: prediction.status === "rejected" ? String(prediction.reason) : null,
      odds: odds.status === "fulfilled" ? odds.value : null,
      oddsError: odds.status === "rejected" ? String(odds.reason) : null,
      incidents: incidents.status === "fulfilled" ? incidents.value : null,
      incidentsError: incidents.status === "rejected" ? String(incidents.reason) : null,
      statistics: statistics.status === "fulfilled" ? statistics.value : null,
      statisticsError: statistics.status === "rejected" ? String(statistics.reason) : null,
      playerStats: playerStats.status === "fulfilled" ? playerStats.value : null,
      // h2h now reads from event.head_to_head — no extra request.
      h2h: (eventVal?.head_to_head ?? null) as BsdH2H | null,
      referee: refRes.status === "fulfilled" ? refRes.value : null,
      venue: venRes.status === "fulfilled" ? venRes.value : null,
      managers: {
        home: hmRes.status === "fulfilled" ? hmRes.value : null,
        away: amRes.status === "fulfilled" ? amRes.value : null,
      },
      playerForm,
      playerDetail,
      playerCareer,
      standings,
    };
  });


export const getMiniEventHeaderBundle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => eventInput.parse(input))
  .handler(async ({ data }) => {
    const { eventId } = data;
    const [event, prediction, odds, incidents, statistics] = await Promise.allSettled([
      bsdFetch<BsdEventListItem & { weather?: Json; attendance?: number | null }>(
        `/api/v2/events/${eventId}/`,
      ),
      bsdFetch<BsdPrediction>(`/api/v2/events/${eventId}/prediction/`),
      bsdFetch<BsdOdds>(`/api/v2/events/${eventId}/odds/`),
      bsdFetch<BsdIncidents>(`/api/v2/events/${eventId}/incidents/`),
      bsdFetch<BsdStatistics>(`/api/v2/events/${eventId}/stats/`),
    ]);

    const eventVal = event.status === "fulfilled" ? event.value : null;
    const venueId = eventVal?.venue_id ?? null;
    const venueRes = await (venueId
      ? bsdFetch<BsdVenueInfo>(`/api/v2/venues/${venueId}/`)
      : Promise.resolve(null as BsdVenueInfo | null)
    ).catch(() => null);

    return {
      event: eventVal,
      eventError: event.status === "rejected" ? String(event.reason) : null,
      prediction: prediction.status === "fulfilled" ? prediction.value : null,
      predictionError: prediction.status === "rejected" ? String(prediction.reason) : null,
      odds: odds.status === "fulfilled" ? odds.value : null,
      oddsError: odds.status === "rejected" ? String(odds.reason) : null,
      incidents: incidents.status === "fulfilled" ? incidents.value : null,
      incidentsError: incidents.status === "rejected" ? String(incidents.reason) : null,
      statistics: statistics.status === "fulfilled" ? statistics.value : null,
      statisticsError: statistics.status === "rejected" ? String(statistics.reason) : null,
      venue: venueRes,
    };
  });
