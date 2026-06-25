// Vertical match timeline. Center rail with minute pills, home events on
// the left, away on the right, period markers straddling the rail.
// Auto-scrolls latest incident into view on update.

import { useEffect, useRef } from "react";

import type { TimelineEvent } from "@/lib/match-derive";

export function MatchTimelineVertical({
  events,
  homeTeam,
  awayTeam,
  liveMinute,
  isLive,
}: {
  events: TimelineEvent[];
  homeTeam: string;
  awayTeam: string;
  liveMinute?: number | null;
  isLive?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sorted = events.slice().sort((a, b) => a.minute - b.minute);

  // Running scoreline
  let h = 0,
    a = 0;
  const enriched = sorted.map((ev) => {
    let score: { home: number; away: number } | undefined;
    if (ev.kind === "goal" || ev.kind === "penalty_goal") {
      if (ev.team === "home") h++;
      else if (ev.team === "away") a++;
      score = { home: h, away: a };
    } else if (ev.kind === "own_goal") {
      if (ev.team === "home") a++;
      else if (ev.team === "away") h++;
      score = { home: h, away: a };
    }
    return { ...ev, score };
  });

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>("[data-latest='true']");
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [events.length]);

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Match incidents will appear here as they happen.
      </div>
    );
  }

  const lastIdx = enriched.length - 1;

  return (
    <div className="relative" ref={containerRef}>
      {/* Header lane labels */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center pb-3 mb-1 border-b border-border/40">
        <div className="text-right pr-3">
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-chart-1">
            {homeTeam}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-2">
          Timeline
        </div>
        <div className="pl-3">
          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-chart-2">
            {awayTeam}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* center rail */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-gradient-to-b from-border/30 via-border/70 to-border/30" />

        <ol className="relative space-y-3">
          {enriched.map((ev, i) => (
            <TimelineRow
              key={`${ev.minute}-${i}-${ev.kind}`}
              ev={ev}
              isLatest={i === lastIdx}
            />
          ))}
          {isLive && typeof liveMinute === "number" && liveMinute > 0 && (
            <li className="relative">
              <div className="flex items-center justify-center">
                <span className="relative inline-flex items-center gap-2 rounded-full border border-live/40 bg-live/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-live">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-live" />
                  </span>
                  Now · {liveMinute}'
                </span>
              </div>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

function TimelineRow({
  ev,
  isLatest,
}: {
  ev: TimelineEvent & { score?: { home: number; away: number } };
  isLatest: boolean;
}) {
  if (ev.kind === "period") {
    return (
      <li className="relative" data-latest={isLatest ? "true" : undefined}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border/60" />
          <span className="rounded-full border border-border/60 bg-background px-3 py-0.5 text-[10px] uppercase tracking-[0.18em] font-mono text-muted-foreground">
            {ev.label}
            {ev.minute > 0 && <span className="ml-1.5 text-foreground">{ev.minute}'</span>}
          </span>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      </li>
    );
  }

  const isHome = ev.team === "home";
  const isAway = ev.team === "away";
  const accent = isHome ? "var(--chart-1)" : isAway ? "var(--chart-2)" : "hsl(var(--muted-foreground))";

  // Center rail content (minute pill + glyph)
  const railContent = (
    <div className="relative flex flex-col items-center w-12 shrink-0">
      <div
        className="z-10 rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums bg-background border"
        style={{ borderColor: accent, color: accent }}
      >
        {ev.minute}'
      </div>
      <div className="z-10 mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-background border" style={{ borderColor: accent }}>
        <Glyph kind={ev.kind} color={accent} />
      </div>
    </div>
  );

  const card = (
    <div
      className="relative flex-1 min-w-0 rounded-md border border-border/60 bg-surface-1/60 px-3 py-2 overflow-hidden"
    >
      <span
        className="absolute top-0 bottom-0 w-[2px]"
        style={{ background: accent, [isHome ? "right" : "left"]: 0 }}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.14em] font-mono text-muted-foreground">
          {ev.label}
        </span>
        {ev.score && (
          <span className="rounded bg-background border border-border/60 px-1.5 py-px text-[10px] font-mono tabular-nums">
            {ev.score.home}–{ev.score.away}
          </span>
        )}
      </div>
      {(ev.player || ev.playerIn || ev.playerOut) && (
        <div className="mt-0.5 text-sm font-semibold truncate">
          {ev.kind === "substitution" ? (
            <span className="inline-flex items-center gap-2">
              {ev.playerIn && <span className="text-emerald-300">↑ {ev.playerIn}</span>}
              {ev.playerOut && <span className="text-rose-300">↓ {ev.playerOut}</span>}
            </span>
          ) : (
            ev.player
          )}
        </div>
      )}
      {ev.assist && (
        <div className="text-[11px] text-muted-foreground truncate">
          assist · <span className="text-foreground">{ev.assist}</span>
        </div>
      )}
      {ev.detail && !ev.assist && (
        <div className="text-[11px] text-muted-foreground truncate">{ev.detail}</div>
      )}
    </div>
  );

  return (
    <li
      className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2"
      data-latest={isLatest ? "true" : undefined}
    >
      {isHome ? card : <div />}
      {railContent}
      {isAway ? card : isHome ? <div /> : <div />}
    </li>
  );
}

function Glyph({ kind, color }: { kind: TimelineEvent["kind"]; color: string }) {
  switch (kind) {
    case "goal":
    case "penalty_goal":
    case "own_goal":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5" fill={color} />
          <text x="7" y="9.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="hsl(var(--background))">⚽</text>
        </svg>
      );
    case "missed_penalty":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <circle cx="7" cy="7" r="5" fill="none" stroke={color} strokeWidth="1.4" />
          <line x1="3.5" x2="10.5" y1="3.5" y2="10.5" stroke={color} strokeWidth="1.4" />
        </svg>
      );
    case "card_yellow":
      return <span className="block h-3.5 w-2.5 rounded-[1px] bg-yellow-400" aria-hidden />;
    case "card_red":
      return <span className="block h-3.5 w-2.5 rounded-[1px] bg-rose-500" aria-hidden />;
    case "card_second_yellow":
      return (
        <span className="relative block h-3.5 w-4">
          <span className="absolute left-0 top-0 h-3.5 w-2 rounded-[1px] bg-yellow-400" />
          <span className="absolute right-0 top-0.5 h-3.5 w-2 rounded-[1px] bg-rose-500" />
        </span>
      );
    case "substitution":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <polygon points="3,8 6,8 4.5,4" fill="#10b981" />
          <polygon points="8,6 11,6 9.5,10" fill="#f43f5e" />
        </svg>
      );
    case "var":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <rect x="2" y="4" width="10" height="6" rx="1" fill="none" stroke={color} strokeWidth="1.2" />
          <text x="7" y="9" textAnchor="middle" fontSize="5" fontWeight="700" fill={color}>VAR</text>
        </svg>
      );
    case "injury":
      return (
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line x1="7" x2="7" y1="3" y2="11" stroke={color} strokeWidth="1.6" />
          <line x1="3" x2="11" y1="7" y2="7" stroke={color} strokeWidth="1.6" />
        </svg>
      );
    default:
      return <span className="block h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />;
  }
}
