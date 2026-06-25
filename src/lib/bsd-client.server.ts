// Server-only HTTP client for the Bzzoiro Sports Data football API.
// All BSD calls MUST go through this module so the token never leaks to the browser.

const BASE_URL = "https://sports.bzzoiro.com";

export class BsdApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public path: string,
  ) {
    super(message);
    this.name = "BsdApiError";
  }
}

// ---------------------------------------------------------------------------
// In-process response cache
// ---------------------------------------------------------------------------
// Eliminates redundant BSD API round-trips (each ~200-400 ms) when the same
// URL is requested multiple times within the TTL window on the same server
// process. Keys are full URLs (including query string); values are the parsed
// JSON payload + an expiry timestamp.
// ---------------------------------------------------------------------------

type CacheEntry = { data: unknown; expiresAt: number };
const _cache = new Map<string, CacheEntry>();

/** Return TTL in milliseconds for a given BSD path. */
function getCacheTtl(path: string): number {
  // Live match data — keep very short so polls stay fresh
  if (/\/events\/\d+\/(incidents|statistics|stats)\//i.test(path)) return 20_000;
  // Match-level endpoints that change slowly once the match is done
  if (/\/events\/\d+\/(prediction|odds|lineups|player-stats)\//i.test(path)) return 120_000;
  // Single event detail
  if (/\/events\/\d+\/$/.test(path)) return 30_000;
  // Event list queries (upcoming/recent/live windows)
  if (/\/events\//.test(path)) return 60_000;
  // League list — rarely changes
  if (/\/leagues\/$/.test(path) || /\/leagues\/\?/.test(path)) return 600_000;
  // League standings
  if (/\/leagues\/\d+\/standings\//.test(path)) return 300_000;
  // Player profiles & career — static biographical data
  if (/\/players\/\d+\/(career|)$/.test(path) || /\/players\/\d+\/$/.test(path)) return 300_000;
  // Player per-match stats
  if (/\/players\/\d+\/stats\//.test(path)) return 300_000;
  // Referee / venue / manager — basically static
  if (/\/(referees|venues|managers)\//.test(path)) return 600_000;
  // Default: 60 seconds
  return 60_000;
}

export async function bsdFetch<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const token = process.env.BSD_API_TOKEN;
  if (!token) {
    throw new BsdApiError(500, "BSD_API_TOKEN is not configured", path);
  }

  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  const cacheKey = url.toString();

  // --- Cache read ---
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new BsdApiError(
      res.status,
      `BSD ${res.status} on ${path}: ${body.slice(0, 200)}`,
      path,
    );
  }

  const data = (await res.json()) as T;

  // --- Cache write ---
  const ttl = getCacheTtl(path);
  _cache.set(cacheKey, { data, expiresAt: Date.now() + ttl });

  // Evict stale entries periodically to prevent unbounded growth (simple GC)
  if (_cache.size > 500) {
    const now = Date.now();
    for (const [k, v] of _cache) {
      if (now >= v.expiresAt) _cache.delete(k);
    }
  }

  return data;
}
