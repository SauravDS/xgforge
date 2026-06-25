import { useMemo } from "react";

import { PlayerRadar, type RadarAxis } from "@/components/charts/PlayerRadar";
import type { BsdPlayerCareer, BsdPlayerDetail } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import type { RankedPlayer } from "@/lib/ranking-engine";

type Per90 = {
  xg: number;
  xa: number;
  shots: number;
  keyPasses: number;
  tackles: number;
  interceptions: number;
  saves: number;
  minutes: number;
  matches: number;
};

function aggregatePer90(rows: unknown[]): Per90 {
  let mins = 0;
  let xg = 0;
  let xa = 0;
  let shots = 0;
  let keyPasses = 0;
  let tackles = 0;
  let interceptions = 0;
  let saves = 0;
  let matches = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, number | null | undefined>;
    const m = Number(r.minutes_played ?? 0) || 0;
    if (m <= 0) continue;
    matches++;
    mins += m;
    xg += Number(r.expected_goals ?? 0) || 0;
    xa += Number(r.expected_assists ?? 0) || 0;
    shots += Number(r.total_shots ?? 0) || 0;
    keyPasses += Number(r.key_pass ?? 0) || 0;
    tackles += Number(r.total_tackle ?? 0) || 0;
    interceptions += Number(r.interception ?? 0) || 0;
    saves += Number(r.saves ?? 0) || 0;
  }
  const per90 = (v: number) => (mins > 0 ? (v / mins) * 90 : 0);
  return {
    xg: per90(xg),
    xa: per90(xa),
    shots: per90(shots),
    keyPasses: per90(keyPasses),
    tackles: per90(tackles),
    interceptions: per90(interceptions),
    saves: per90(saves),
    minutes: mins,
    matches,
  };
}

// Normalisation caps tuned to elite-league per-90 ceilings.
const CAPS = {
  shooting: 1.2, // xG/90 + shots*0.05
  creating: 0.8, // xA/90 + key_passes*0.05
  defending: 6.0, // tackles + interceptions per 90
  volume: 2.0, // shots + key passes per 90 (activity)
  goalkeeping: 5.5, // saves per 90
};

type Computed = {
  player: RankedPlayer;
  axes: RadarAxis[];
  per90: Per90;
};

function computeAxes(p: RankedPlayer, per90: Per90): RadarAxis[] {
  const pos = String(p.position);
  if (pos === "G") {
    return [
      { key: "save", label: "Saves", value: per90.saves / CAPS.goalkeeping },
      {
        key: "def",
        label: "Defending",
        value: (per90.tackles + per90.interceptions) / CAPS.defending,
      },
      { key: "vol", label: "Activity", value: per90.shots / CAPS.volume },
      { key: "min", label: "Minutes", value: Math.min(1, per90.minutes / 900) },
    ];
  }
  return [
    {
      key: "shoot",
      label: "Shooting",
      value: (per90.xg + per90.shots * 0.05) / CAPS.shooting,
    },
    {
      key: "create",
      label: "Creating",
      value: (per90.xa + per90.keyPasses * 0.05) / CAPS.creating,
    },
    {
      key: "def",
      label: "Defending",
      value: (per90.tackles + per90.interceptions) / CAPS.defending,
    },
    {
      key: "vol",
      label: "Volume",
      value: (per90.shots + per90.keyPasses) / CAPS.volume,
    },
  ];
}

export function TopPlayersDeck({
  ranking,
  playerForm,
  playerDetail,
  playerCareer,
  perSide = 3,
}: {
  ranking: {
    top11: RankedPlayer[];
    alternates: RankedPlayer[];
    context: { home_team: string; away_team: string };
  };
  playerForm: PlayerFormMap;
  playerDetail?: Record<string, BsdPlayerDetail>;
  playerCareer?: Record<string, BsdPlayerCareer>;
  perSide?: number;
}) {
  const { home, away } = useMemo(() => {
    const all = [...ranking.top11, ...ranking.alternates];
    const compute = (list: RankedPlayer[]): Computed[] =>
      list
        .map((p) => {
          const rows = playerForm[String(p.id)] ?? [];
          const per90 = aggregatePer90(rows);
          return { player: p, per90, axes: computeAxes(p, per90) };
        })
        .filter((c) => c.per90.matches > 0)
        .sort((a, b) => b.player.projection - a.player.projection)
        .slice(0, perSide);
    return {
      home: compute(all.filter((p) => p.team_side === "home")),
      away: compute(all.filter((p) => p.team_side === "away")),
    };
  }, [ranking, playerForm, perSide]);

  if (!home.length && !away.length) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Top players · per side</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Radar covers per-90 averages from the last ~20 matches. Caps tuned to
          elite-league ceilings.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
        <SideColumn
          team={ranking.context.home_team}
          toneCls="bg-chart-1"
          players={home}
          playerDetail={playerDetail}
          playerCareer={playerCareer}
        />
        <SideColumn
          team={ranking.context.away_team}
          toneCls="bg-chart-2"
          players={away}
          playerDetail={playerDetail}
          playerCareer={playerCareer}
        />
      </div>
    </section>
  );
}

function SideColumn({
  team,
  toneCls,
  players,
  playerDetail,
  playerCareer,
}: {
  team: string;
  toneCls: string;
  players: Computed[];
  playerDetail?: Record<string, BsdPlayerDetail>;
  playerCareer?: Record<string, BsdPlayerCareer>;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`inline-block h-2 w-2 rounded-sm ${toneCls}`} />
        <h3 className="font-semibold text-sm tracking-tight">{team}</h3>
      </div>
      {players.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1">No form data available.</p>
      ) : (
        <div className="space-y-3">
          {players.map(({ player, per90, axes }) => (
            <PlayerCard
              key={player.id}
              player={player}
              per90={per90}
              axes={axes}
              detail={playerDetail?.[String(player.id)] ?? null}
              career={playerCareer?.[String(player.id)] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  per90,
  axes,
  detail,
  career,
}: {
  player: RankedPlayer;
  per90: Per90;
  axes: RadarAxis[];
  detail: BsdPlayerDetail | null;
  career: BsdPlayerCareer | null;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface-1/40 p-3">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <PlayerRadar axes={axes} size={120} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="font-semibold truncate">{player.name}</span>
            <span className="text-[10px] uppercase rounded border border-border/60 px-1.5 py-0.5 text-muted-foreground">
              {String(player.position)}
            </span>
            {detail?.preferred_foot && (
              <span className="text-[10px] uppercase rounded border border-border/60 px-1.5 py-0.5 text-muted-foreground">
                {detail.preferred_foot} foot
              </span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">
            {per90.matches} match{per90.matches === 1 ? "" : "es"} · {Math.round(per90.minutes)} min
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums">
            <StatLine label="xG/90" v={per90.xg} />
            <StatLine label="xA/90" v={per90.xa} />
            <StatLine label="Sh/90" v={per90.shots} />
            <StatLine label="KP/90" v={per90.keyPasses} />
            {String(player.position) === "G" ? (
              <StatLine label="Sv/90" v={per90.saves} />
            ) : (
              <StatLine label="Tkl/90" v={per90.tackles + per90.interceptions} />
            )}
            <StatLine label="Proj" v={player.projection} bold />
          </dl>
        </div>
      </div>

      {detail && <AttributesRow detail={detail} />}

      {(detail?.strengths?.length || detail?.weaknesses?.length) ? (
        <StrengthsRow strengths={detail.strengths ?? []} weaknesses={detail.weaknesses ?? []} />
      ) : null}

      {career && career.seasons && career.seasons.length > 1 && (
        <CareerArc career={career} />
      )}
    </div>
  );
}

function AttributesRow({ detail }: { detail: BsdPlayerDetail }) {
  const items: { label: string; value: string }[] = [];
  const age = ageFromDob(detail.date_of_birth);
  if (age !== null) items.push({ label: "Age", value: `${age}` });
  if (detail.height_cm) items.push({ label: "Height", value: `${detail.height_cm} cm` });
  if (detail.nationality) items.push({ label: "Nat.", value: detail.nationality });
  if (detail.market_value_eur) items.push({ label: "Value", value: formatEur(detail.market_value_eur) });
  if (!items.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {items.map((it) => (
        <span key={it.label}>
          {it.label}{" "}
          <span className="font-mono tabular-nums text-foreground/85 normal-case tracking-normal">
            {it.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function StrengthsRow({ strengths, weaknesses }: { strengths: string[]; weaknesses: string[] }) {
  if (!strengths.length && !weaknesses.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {strengths.slice(0, 4).map((s) => (
        <span
          key={`s-${s}`}
          className="text-[9px] uppercase tracking-wider rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-1.5 py-0.5"
        >
          + {s}
        </span>
      ))}
      {weaknesses.slice(0, 3).map((w) => (
        <span
          key={`w-${w}`}
          className="text-[9px] uppercase tracking-wider rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 px-1.5 py-0.5"
        >
          − {w}
        </span>
      ))}
    </div>
  );
}

function CareerArc({ career }: { career: BsdPlayerCareer }) {
  const seasons = career.seasons.filter(
    (s) => typeof s.avg_rating === "number" && s.avg_rating !== null && s.avg_rating > 0,
  );
  if (seasons.length < 2) return null;
  const ratings = seasons.map((s) => Number(s.avg_rating ?? 0));
  const min = Math.min(...ratings, 5);
  const max = Math.max(...ratings, 8);
  const W = 120;
  const H = 24;
  const range = max - min || 1;
  const points = ratings
    .map((r, i) => {
      const x = (i / (ratings.length - 1)) * W;
      const y = H - ((r - min) / range) * (H - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = ratings[ratings.length - 1];
  const first = ratings[0];
  const delta = last - first;

  // Sum goals across all valid seasons for context
  const totalGoals = seasons.reduce((acc, s) => acc + (Number(s.goals) || 0), 0);
  const totalAssists = seasons.reduce((acc, s) => acc + (Number(s.assists) || 0), 0);

  return (
    <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground shrink-0">
        Career arc
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
        <polyline
          points={points}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={1.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {ratings.map((r, i) => {
          const x = (i / (ratings.length - 1)) * W;
          const y = H - ((r - min) / range) * (H - 4) - 2;
          return <circle key={i} cx={x} cy={y} r={1.4} fill="var(--primary)" />;
        })}
      </svg>
      <div className="text-[10px] font-mono tabular-nums text-muted-foreground">
        {seasons.length} seasons · {totalGoals}G {totalAssists}A
      </div>
      <div className={`text-[10px] font-mono tabular-nums ml-auto ${delta >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}
      </div>
    </div>
  );
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const years = diff / (365.25 * 24 * 60 * 60 * 1000);
  return Math.floor(years);
}

function formatEur(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}k`;
  return `€${n}`;
}

function StatLine({
  label,
  v,
  bold,
}: {
  label: string;
  v: number;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-semibold text-foreground" : ""}>{v.toFixed(2)}</dd>
    </div>
  );
}
