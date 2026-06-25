// Sortable post-match player table — both squads in one view. Uses the
// pre-match ranking (which already aggregates lineup + playerForm) so the
// columns line up with what users saw before kickoff. Columns: Min, xG/90,
// xA/90, Sh/90, KP/90, Tk/90, Proj.

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import type { PlayerFormMap } from "@/lib/bsd.functions";
import type { RankedPlayer } from "@/lib/ranking-engine";

type Row = {
  p: RankedPlayer;
  minutes: number;
  xg90: number;
  xa90: number;
  sh90: number;
  kp90: number;
  tkl90: number;
};

type SortKey = "team" | "name" | "minutes" | "xg90" | "xa90" | "sh90" | "kp90" | "tkl90" | "proj";

function aggregate(players: RankedPlayer[], form: PlayerFormMap): Row[] {
  return players.map((p) => {
    const rows = form[String(p.id)] ?? [];
    let mins = 0, xg = 0, xa = 0, sh = 0, kp = 0, tk = 0, intc = 0;
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, number | null | undefined>;
      const m = Number(r.minutes_played ?? 0) || 0;
      if (m <= 0) continue;
      mins += m;
      xg += Number(r.expected_goals ?? 0) || 0;
      xa += Number(r.expected_assists ?? 0) || 0;
      sh += Number(r.total_shots ?? 0) || 0;
      kp += Number(r.key_pass ?? 0) || 0;
      tk += Number(r.total_tackle ?? 0) || 0;
      intc += Number(r.interception ?? 0) || 0;
    }
    const per90 = (v: number) => (mins > 0 ? (v / mins) * 90 : 0);
    return {
      p,
      minutes: mins,
      xg90: per90(xg),
      xa90: per90(xa),
      sh90: per90(sh),
      kp90: per90(kp),
      tkl90: per90(tk + intc),
    };
  });
}

export function FinishedPlayerTable({
  ranking,
  playerForm,
}: {
  ranking: {
    top11: RankedPlayer[];
    alternates: RankedPlayer[];
    context: { home_team: string; away_team: string };
  };
  playerForm: PlayerFormMap;
}) {
  const rows = useMemo(
    () => aggregate([...ranking.top11, ...ranking.alternates], playerForm),
    [ranking, playerForm],
  );
  const [sortKey, setSortKey] = useState<SortKey>("proj");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      const x = read(a, sortKey);
      const y = read(b, sortKey);
      if (typeof x === "string" && typeof y === "string") {
        return dir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
      }
      return dir === "asc" ? (x as number) - (y as number) : (y as number) - (x as number);
    });
    return copy;
  }, [rows, sortKey, dir]);

  if (!rows.length) return null;

  // Per-column percentile shading uses the column max as denominator.
  const maxFor: Record<string, number> = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of ["minutes", "xg90", "xa90", "sh90", "kp90", "tkl90", "proj"] as const) {
      m[k] = Math.max(0.001, ...rows.map((r) => (k === "proj" ? r.p.projection : (r[k] as number))));
    }
    return m;
  }, [rows]);

  const handle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir(k === "name" || k === "team" ? "asc" : "desc");
    }
  };

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Player table — both squads</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pre-match per-90 averages across last ~20 matches, percentile-shaded
          within column. Sortable.
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/60 bg-surface-1/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Th label="Team" k="team" sortKey={sortKey} dir={dir} onClick={handle} />
              <Th label="Player" k="name" sortKey={sortKey} dir={dir} onClick={handle} />
              <Th label="Min" k="minutes" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="xG/90" k="xg90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="xA/90" k="xa90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Sh/90" k="sh90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="KP/90" k="kp90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Tk/90" k="tkl90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Proj" k="proj" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono tabular-nums">
            {sorted.map((r) => (
              <tr key={r.p.id} className={r.p.is_starter ? "" : "opacity-60"}>
                <td className="px-3 py-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-sm mr-1.5 ${r.p.team_side === "home" ? "bg-chart-1" : "bg-chart-2"}`}
                  />
                  <span className="font-sans text-[11px] text-muted-foreground">
                    {r.p.team_side === "home" ? ranking.context.home_team : ranking.context.away_team}
                  </span>
                </td>
                <td className="px-3 py-1.5 font-sans">
                  <span className="font-medium">{r.p.name}</span>
                  <span className="ml-1.5 text-[9px] uppercase rounded border border-border/60 px-1 text-muted-foreground">
                    {String(r.p.position)}
                  </span>
                </td>
                <Cell value={r.minutes} max={maxFor.minutes} fmt={(v) => Math.round(v).toString()} />
                <Cell value={r.xg90} max={maxFor.xg90} fmt={(v) => v.toFixed(2)} />
                <Cell value={r.xa90} max={maxFor.xa90} fmt={(v) => v.toFixed(2)} />
                <Cell value={r.sh90} max={maxFor.sh90} fmt={(v) => v.toFixed(1)} />
                <Cell value={r.kp90} max={maxFor.kp90} fmt={(v) => v.toFixed(1)} />
                <Cell value={r.tkl90} max={maxFor.tkl90} fmt={(v) => v.toFixed(1)} />
                <Cell value={r.p.projection} max={maxFor.proj} fmt={(v) => v.toFixed(1)} bold />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function read(r: Row, k: SortKey): number | string {
  switch (k) {
    case "team": return r.p.team_side;
    case "name": return r.p.name;
    case "minutes": return r.minutes;
    case "xg90": return r.xg90;
    case "xa90": return r.xa90;
    case "sh90": return r.sh90;
    case "kp90": return r.kp90;
    case "tkl90": return r.tkl90;
    case "proj": return r.p.projection;
  }
}

function Cell({ value, max, fmt, bold }: { value: number; max: number; fmt: (v: number) => string; bold?: boolean }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <td className="px-3 py-1.5 text-right relative">
      <span
        className="absolute inset-y-1 left-1 right-1 rounded-sm -z-0"
        style={{
          background: `color-mix(in oklab, var(--primary) ${Math.round(pct * 22)}%, transparent)`,
        }}
      />
      <span className={`relative ${bold ? "font-semibold text-foreground" : ""}`}>
        {fmt(value)}
      </span>
    </td>
  );
}

function Th({
  label,
  k,
  sortKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = k === sortKey;
  return (
    <th
      onClick={() => onClick(k)}
      className={`px-3 py-1.5 cursor-pointer select-none hover:text-foreground ${align === "right" ? "text-right" : "text-left"} ${active ? "text-foreground" : ""}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}
