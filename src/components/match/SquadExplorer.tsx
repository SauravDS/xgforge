// Full-squad sortable explorer. Combines both sides' projected XI + alternates
// with per-90 averages from playerForm. Click any column header to sort.

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import type { PlayerFormMap } from "@/lib/bsd.functions";
import type { RankedPlayer } from "@/lib/ranking-engine";

type Row = {
  p: RankedPlayer;
  minutes: number;
  matches: number;
  xg90: number;
  xa90: number;
  sh90: number;
  kp90: number;
  tkl90: number;
};

type SortKey =
  | "rank"
  | "name"
  | "pos"
  | "minutes"
  | "xg90"
  | "xa90"
  | "sh90"
  | "kp90"
  | "tkl90"
  | "proj";

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

function rowsFor(players: RankedPlayer[], form: PlayerFormMap): Row[] {
  return players.map((p) => {
    const rows = form[String(p.id)] ?? [];
    let mins = 0, xg = 0, xa = 0, sh = 0, kp = 0, tk = 0, intc = 0, matches = 0;
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, number | null | undefined>;
      const m = Number(r.minutes_played ?? 0) || 0;
      if (m <= 0) continue;
      matches++;
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
      matches,
      xg90: per90(xg),
      xa90: per90(xa),
      sh90: per90(sh),
      kp90: per90(kp),
      tkl90: per90(tk + intc),
    };
  });
}

export function SquadExplorer({
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
  const all = useMemo(
    () => rowsFor([...ranking.top11, ...ranking.alternates], playerForm),
    [ranking, playerForm],
  );
  const home = all.filter((r) => r.p.team_side === "home");
  const away = all.filter((r) => r.p.team_side === "away");
  if (!home.length && !away.length) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Squad explorer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Full projected squad both sides. Click any column to sort. Per-90 from
          each player's last ~20 matches.
        </p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
        <SquadTable team={ranking.context.home_team} tone="bg-chart-1" rows={home} />
        <SquadTable team={ranking.context.away_team} tone="bg-chart-2" rows={away} />
      </div>
    </section>
  );
}

function SquadTable({ team, tone, rows }: { team: string; tone: string; rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("proj");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      const x = readKey(a, sortKey);
      const y = readKey(b, sortKey);
      if (typeof x === "string" && typeof y === "string") {
        return dir === "asc" ? x.localeCompare(y) : y.localeCompare(x);
      }
      const xn = x as number;
      const yn = y as number;
      return dir === "asc" ? xn - yn : yn - xn;
    });
    return copy;
  }, [rows, sortKey, dir]);

  const handle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setDir(k === "name" || k === "pos" ? "asc" : "desc");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
        <h3 className="font-semibold text-sm tracking-tight truncate">{team}</h3>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground ml-auto">
          {sorted.length} players
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-y border-border/60 bg-surface-1/40 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Th label="#" k="rank" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Pos" k="pos" sortKey={sortKey} dir={dir} onClick={handle} />
              <Th label="Player" k="name" sortKey={sortKey} dir={dir} onClick={handle} />
              <Th label="Min" k="minutes" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="xG/90" k="xg90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="xA/90" k="xa90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Sh/90" k="sh90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="KP/90" k="kp90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="Tk/90" k="tkl90" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
              <Th label="xG Forge Proj" k="proj" sortKey={sortKey} dir={dir} onClick={handle} align="right" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono tabular-nums">
            {sorted.map((r) => (
              <tr key={r.p.id} className={r.p.is_starter ? "" : "opacity-60"}>
                <td className="px-2 py-1.5 text-right text-muted-foreground">{r.p.rank}</td>
                <td className="px-2 py-1.5">
                  <PosTag pos={String(r.p.position)} />
                </td>
                <td className="px-2 py-1.5">
                  <div className="font-sans flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium">{r.p.name}</span>
                    {!r.p.is_starter && (
                      <span className="text-[9px] uppercase rounded border border-border/60 px-1 text-muted-foreground">
                        Sub
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right">{Math.round(r.minutes)}</td>
                <td className="px-2 py-1.5 text-right">{r.xg90.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right">{r.xa90.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right">{r.sh90.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right">{r.kp90.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right">{r.tkl90.toFixed(1)}</td>
                <td className="px-2 py-1.5 text-right font-semibold text-foreground">
                  {r.p.projection.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function readKey(r: Row, k: SortKey): number | string {
  switch (k) {
    case "rank": return r.p.rank;
    case "name": return r.p.name;
    case "pos": return POS_ORDER[String(r.p.position)] ?? 9;
    case "minutes": return r.minutes;
    case "xg90": return r.xg90;
    case "xa90": return r.xa90;
    case "sh90": return r.sh90;
    case "kp90": return r.kp90;
    case "tkl90": return r.tkl90;
    case "proj": return r.p.projection;
  }
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
      className={`px-2 py-1.5 cursor-pointer select-none hover:text-foreground ${align === "right" ? "text-right" : "text-left"} ${active ? "text-foreground" : ""}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""}`}>
        {label}
        {active && (dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );
}

function PosTag({ pos }: { pos: string }) {
  const map: Record<string, string> = {
    G: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    D: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    M: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    F: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return (
    <span className={`inline-block text-[9px] font-semibold rounded border px-1 py-0.5 ${map[pos] ?? "bg-muted text-muted-foreground border-border"}`}>
      {pos === "G" ? "GK" : pos === "D" ? "DEF" : pos === "M" ? "MID" : pos === "F" ? "FWD" : pos}
    </span>
  );
}
