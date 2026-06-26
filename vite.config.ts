// The @lovable.dev/vite-tanstack-config wrapper already bundles the following
// plugins — adding them a second time will cause errors:
//   tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (cloudflare
//   preset by default), componentTagger (dev), VITE_* env injection, @ alias,
//   React/TanStack dedupe, error logger, and sandbox port detection.
// Pass any additional Vite config via the second argument to defineConfig().
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    routeRules: {
      // Home / list pages — data changes at most every 30 seconds (live) or
      // every few minutes (upcoming/recent). CDN serves from edge cache; revalidates
      // in the background so users never wait on the BSD API.
      "/_server/getHomeMiniBundle": {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      },
      "/_server/getHomeBundle": {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
      },
      "/_server/listUpcomingEvents": {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" },
      },
      "/_server/listLeagues": {
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" },
      },
      "/_server/getOngoingSeries": {
        headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600" },
      },
      "/_server/getSeriesView": {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" },
      },
      "/_server/getCategoryList": {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
      },
      // Match bundle — live matches need fresh data; finished/upcoming are static.
      // We use a short s-maxage so live polls stay fresh.
      "/_server/getEventBundle": {
        headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
      },
      "/_server/getMiniEventHeaderBundle": {
        headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
      },
      "/_server/getMatchHeadline": {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
      },
      "/_server/getLeaguePulse": {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

