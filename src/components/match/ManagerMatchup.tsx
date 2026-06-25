// Side-by-side manager card. Pulls tactical profile + preferred formation
// chips plus a small grid of bars for win%, GF/90, GA/90, possession,
// clean-sheet%, BTTS%, Over 2.5%.

import type { BsdManager } from "@/lib/bsd-types";

export function ManagerMatchup({
  home,
  away,
  homeTeam,
  awayTeam,
}: {
  home: BsdManager | null;
  away: BsdManager | null;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!home && !away) return null;
  const rows: { key: string; label: string; fmt: "pct" | "dec2"; h: number | null; a: number | null }[] = [
    { key: "win", label: "Win rate", fmt: "pct", h: home?.win_pct ?? null, a: away?.win_pct ?? null },
    { key: "gf", label: "Goals for / match", fmt: "dec2", h: home?.avg_goals_scored ?? null, a: away?.avg_goals_scored ?? null },
    { key: "ga", label: "Goals conceded / match", fmt: "dec2", h: home?.avg_goals_conceded ?? null, a: away?.avg_goals_conceded ?? null },
    { key: "poss", label: "Possession", fmt: "pct", h: home?.avg_possession ?? null, a: away?.avg_possession ?? null },
    { key: "cs", label: "Clean sheets", fmt: "pct", h: home?.clean_sheet_pct ?? null, a: away?.clean_sheet_pct ?? null },
    { key: "btts", label: "BTTS rate", fmt: "pct", h: home?.btts_pct ?? null, a: away?.btts_pct ?? null },
    { key: "over25", label: "Over 2.5 rate", fmt: "pct", h: home?.over_25_pct ?? null, a: away?.over_25_pct ?? null },
  ];

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Manager matchup</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Career-to-date numbers at each manager's current side.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
        <SideHeader manager={home} team={homeTeam} side="home" />
        <SideHeader manager={away} team={awayTeam} side="away" />
      </div>
      <div className="px-5 py-4 space-y-3">
        {rows.map((r) => (
          <ManagerStatBar
            key={r.key}
            label={r.label}
            home={r.h}
            away={r.a}
            fmt={r.fmt}
          />
        ))}
      </div>
    </section>
  );
}

function SideHeader({
  manager,
  team,
  side,
}: {
  manager: BsdManager | null;
  team: string;
  side: "home" | "away";
}) {
  const tone = side === "home" ? "bg-chart-1" : "bg-chart-2";
  if (!manager) {
    return (
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{team}</span>
        </div>
        <p className="text-xs text-muted-foreground">Manager unavailable.</p>
      </div>
    );
  }
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{team}</span>
      </div>
      <div className="font-semibold text-sm tracking-tight truncate">{manager.name}</div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {manager.tactical_profile && (
          <span className="rounded border border-border/60 bg-surface-2/40 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-foreground/85">
            {manager.tactical_profile}
          </span>
        )}
        {manager.preferred_formation && (
          <span className="rounded border border-border/60 bg-surface-2/40 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-foreground/85">
            {manager.preferred_formation}
          </span>
        )}
        {typeof manager.matches_total === "number" && (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {manager.matches_total} m
          </span>
        )}
      </div>
    </div>
  );
}

function ManagerStatBar({
  label,
  home,
  away,
  fmt,
}: {
  label: string;
  home: number | null;
  away: number | null;
  fmt: "pct" | "dec2";
}) {
  const h = home ?? 0;
  const a = away ?? 0;
  // Use a shared max for visual comparability:
  // pct values are 0..100; dec2 (goals/match) we cap at 4.
  const max = fmt === "pct" ? 100 : Math.max(2, h, a) * 1.05;
  const hPct = max > 0 ? Math.min(100, (h / max) * 100) : 0;
  const aPct = max > 0 ? Math.min(100, (a / max) * 100) : 0;

  const formatV = (v: number | null) => {
    if (v === null) return "—";
    if (fmt === "pct") return `${v.toFixed(1)}%`;
    return v.toFixed(2);
  };

  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
        <span className="font-mono tabular-nums text-chart-1">{formatV(home)}</span>
        <span>{label}</span>
        <span className="font-mono tabular-nums text-chart-2">{formatV(away)}</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden flex justify-end">
          <div className="h-full bg-chart-1" style={{ width: `${hPct}%` }} />
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
          <div className="h-full bg-chart-2" style={{ width: `${aPct}%` }} />
        </div>
      </div>
    </div>
  );
}
