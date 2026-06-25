import { queryOptions } from "@tanstack/react-query";

import {
  getCategoryList,
  getOngoingSeries,
  getSeriesView,
} from "./bsd.functions";

export const liveListQueryOptions = queryOptions({
  queryKey: ["category-list", "live"],
  queryFn: () => getCategoryList({ data: { kind: "live" as const, hours: 48 } }),
  staleTime: 30_000,
});

export const upcomingListQueryOptions = queryOptions({
  queryKey: ["category-list", "upcoming"],
  queryFn: () =>
    getCategoryList({ data: { kind: "upcoming" as const, hours: 48 } }),
  staleTime: 5 * 60_000,
});

export const recentListQueryOptions = queryOptions({
  queryKey: ["category-list", "recent"],
  queryFn: () =>
    getCategoryList({ data: { kind: "recent" as const, hours: 48 } }),
  staleTime: 5 * 60_000,
});

export const seriesIndexQueryOptions = queryOptions({
  queryKey: ["series-index"],
  queryFn: () => getOngoingSeries(),
  staleTime: 10 * 60_000,
});

export const seriesViewQueryOptions = (leagueId: number) =>
  queryOptions({
    queryKey: ["series-view", leagueId],
    queryFn: () => getSeriesView({ data: { leagueId } }),
    staleTime: 60_000,
  });
