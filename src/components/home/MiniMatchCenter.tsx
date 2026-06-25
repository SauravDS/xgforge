import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { LiveMatchHeaderBlock } from "@/components/match/LiveMatchHeaderBlock";
import { getMiniEventHeaderBundle, type HomeBundleEvent } from "@/lib/bsd.functions";
import type { CardEnrichment } from "@/lib/home-enrichments.functions";
import { sortByPopularity } from "@/lib/league-popularity";
import { useMatchSimulation } from "@/lib/use-match-simulation";

import { FeaturedFixture } from "./FeaturedFixture";

const MAX_LIVE_FEATURED = 6;

function MiniMatchSlide({
  ev,
  showHint,
  enabled,
  phase,
}: {
  ev: HomeBundleEvent;
  showHint: boolean;
  enabled: boolean;
  phase: "live" | "finished";
}) {
  const fetchBundle = useServerFn(getMiniEventHeaderBundle);
  const q = useQuery({
    queryKey: ["match-header-mini", ev.id],
    queryFn: () => fetchBundle({ data: { eventId: ev.id } }),
    staleTime: 20_000,
    refetchInterval: enabled && phase === "live" ? 30_000 : false,
    enabled,
  });



  const bundle = q.data;

  const { modelHome, modelAway } = useMemo(() => extractModelStrength(bundle?.prediction), [bundle]);
  const sim = useMatchSimulation(bundle?.odds ?? null, modelHome, modelAway);
  const headerData = bundle?.event
    ? bundle
    : { event: ev, incidents: null, statistics: null, venue: null };

  return (
    <Link
      to="/match/$eventId"
      params={{ eventId: String(ev.id) }}
      className="group block rounded-xl border border-live/40 bg-gradient-to-br from-live/10 via-card to-card hover:border-live/70 transition-colors overflow-hidden relative"
    >
      <div className="pitch-lines absolute inset-0 opacity-[0.08] pointer-events-none" />
      <div className="relative px-3 sm:px-5 py-3 sm:py-5 min-w-0">
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="truncate min-w-0">
            {ev.league_country ? `${ev.league_country} · ` : ""}
            {ev.league_name ?? `League #${ev.league_id}`}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 text-primary opacity-80 group-hover:opacity-100 transition-opacity tracking-[0.18em]">
            Open <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>

        <LiveMatchHeaderBlock data={headerData} simulation={sim} phase={phase} density="compact" />
      </div>

      {showHint && (
        <div className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-live/40 bg-background/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-live shadow-sm animate-pulse">
          <span className="hidden sm:inline">Swipe for more live matches</span>
          <span className="sm:hidden">Swipe</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      )}
    </Link>
  );
}

function pickNumber(obj: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value.replace("%", "").trim());
      if (Number.isFinite(n)) return n > 1 ? n / 100 : n;
    }
  }
  return null;
}

function extractModelStrength(prediction: unknown): { modelHome: number; modelAway: number } {
  const fallback = { modelHome: 0.45, modelAway: 0.45 };
  if (!prediction || typeof prediction !== "object" || Array.isArray(prediction)) return fallback;
  const root = prediction as Record<string, unknown>;
  const candidates: Record<string, unknown>[] = [root];
  for (const key of ["outcome", "match_result", "result", "winner", "probabilities", "probs"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      candidates.push(nested as Record<string, unknown>);
    }
  }

  for (const obj of candidates) {
    const home = pickNumber(obj, ["prob_home_win", "home_win_prob", "prob_home", "home_win", "home", "1"]);
    const away = pickNumber(obj, ["prob_away_win", "away_win_prob", "prob_away", "away_win", "away", "2"]);
    if (home !== null && away !== null && home + away > 0) {
      const total = home + away;
      return { modelHome: home / total, modelAway: away / total };
    }
  }
  return fallback;
}


export function MiniMatchCenter({
  live,
  upcoming,
  recent = [],
}: {
  live: HomeBundleEvent[];
  upcoming: HomeBundleEvent[];
  recent?: HomeBundleEvent[];
  liveEnr?: Record<string, CardEnrichment>;
}) {
  const isLive = live.length > 0;
  const featuredList = useMemo(
    () =>
      isLive
        ? sortByPopularity(live, "live").slice(0, MAX_LIVE_FEATURED)
        : sortByPopularity(recent, "recent").slice(0, 4),
    [isLive, live, recent],
  );
  const phase: "live" | "finished" = isLive ? "live" : "finished";


  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [hintHidden, setHintHidden] = useState(false);

  useEffect(() => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(activeIndex);
      next.add(activeIndex + 1);
      next.add(activeIndex - 1);
      return next;
    });
  }, [activeIndex]);


  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, featuredList.length);
  }, [featuredList.length]);

  useEffect(() => {
    if (featuredList.length < 2) return;
    const t = setTimeout(() => setHintHidden(true), 6000);
    return () => clearTimeout(t);
  }, [featuredList.length]);

  useEffect(() => {
    if (featuredList.length < 2) return;
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = slideRefs.current.findIndex((el) => el === e.target);
            if (idx >= 0) {
              setActiveIndex(idx);
              if (idx > 0) setHintHidden(true);
            }
          }
        }
      },
      { root: container, threshold: [0.6] },
    );
    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [featuredList.length]);

  const header = (
    <header className="mb-4 flex items-end justify-between gap-3 sm:gap-6 flex-wrap">
      <h2 className="font-display text-2xl sm:text-4xl leading-none">{isLive ? "Live now" : "Just Finished"}</h2>
      {featuredList.length > 1 && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono tabular-nums">
          {activeIndex + 1} / {featuredList.length}
        </span>
      )}
    </header>
  );

  if (featuredList.length === 0) {
    return (
      <section>
        {header}
        <FeaturedFixture upcoming={upcoming} />
      </section>
    );
  }

  if (featuredList.length === 1) {
    return (
      <section>
        {header}
        <MiniMatchSlide ev={featuredList[0]} showHint={false} enabled phase={phase} />
      </section>
    );
  }

  const scrollToIndex = (idx: number) => {
    const el = slideRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <section>
      {header}
      <div className="relative">
        <div
          ref={containerRef}
          className="flex overflow-x-auto snap-x snap-mandatory gap-3 scrollbar-none -mx-1 px-1"
          style={{ scrollPaddingInline: "0.25rem" }}
        >
          {featuredList.map((ev, i) => (
            <div
              key={ev.id}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="snap-start shrink-0 w-full"
            >
              <MiniMatchSlide ev={ev} showHint={i === 0 && !hintHidden} enabled={visited.has(i)} phase={phase} />
            </div>
          ))}
        </div>

        <button
          type="button"
          aria-label="Previous live match"
          disabled={activeIndex === 0}
          onClick={(e) => {
            stop(e);
            scrollToIndex(Math.max(0, activeIndex - 1));
          }}
          className="hidden md:grid place-items-center absolute left-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border/60 bg-background/80 backdrop-blur text-foreground/80 hover:text-foreground hover:border-live/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next live match"
          disabled={activeIndex >= featuredList.length - 1}
          onClick={(e) => {
            stop(e);
            scrollToIndex(Math.min(featuredList.length - 1, activeIndex + 1));
          }}
          className="hidden md:grid place-items-center absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-border/60 bg-background/80 backdrop-blur text-foreground/80 hover:text-foreground hover:border-live/60 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          {featuredList.map((ev, i) => (
            <button
              key={ev.id}
              type="button"
              aria-label={`Go to live match ${i + 1}`}
              onClick={(e) => {
                stop(e);
                scrollToIndex(i);
              }}
              className="p-1.5 -m-1 group"
            >
              <span
                className={`block h-1.5 rounded-full transition-all ${
                  i === activeIndex ? "w-5 bg-live" : "w-1.5 bg-border/70 group-hover:bg-border"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
