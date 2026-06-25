export const LIVE_EVENT_STATUSES = [
  "inprogress",
  "1st_half",
  "2nd_half",
  "halftime",
  "extra_time",
  "penalties",
] as const;

export function normalizeMatchStatus(status: string | null | undefined): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isLiveMatchStatus(status: string | null | undefined): boolean {
  return (LIVE_EVENT_STATUSES as readonly string[]).includes(normalizeMatchStatus(status));
}

export function isFinishedMatchStatus(status: string | null | undefined): boolean {
  return normalizeMatchStatus(status) === "finished";
}