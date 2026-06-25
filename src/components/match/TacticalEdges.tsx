import { useMemo } from "react";

import { DivergingStatBar } from "@/components/charts/DivergingStatBar";
import type { BsdLineupPlayer } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import { sumSideRaw } from "@/lib/lineup-per90";
import type { TacticalSource } from "@/lib/select-tactical-xi";

type Row = { key: string; label: string; home: number; away: number };

function per90(value: number, minutes: number): number {
  return minutes > 0 ? (value / minutes) * 90 : 0;
}

export function TacticalEdges({
  source,
  homePlayers,
  awayPlayers,
  homeTeam,
  awayTeam,
  playerForm,
}: {
  source: TacticalSource;
  homePlayers: BsdLineupPlayer[];
  awayPlayers: BsdLineupPlayer[];
  homeTeam: string;
  awayTeam: string;
  playerForm: PlayerFormMap;
}) {
  const rows = useMemo<Row[]>(() => {
    if (!source) return [];
    const H = sumSideRaw(homePlayers, playerForm);
    const A = sumSideRaw(awayPlayers, playerForm);
    return [
      { key: "xg", label: "xG / 90 (XI)", home: per90(H.xg, H.minutes) * 11, away: per90(A.xg, A.minutes) * 11 },
      { key: "xa", label: "xA / 90 (XI)", home: per90(H.xa, H.minutes) * 11, away: per90(A.xa, A.minutes) * 11 },
      { key: "sh", label: "Shots / 90 (XI)", home: per90(H.shots, H.minutes) * 11, away: per90(A.shots, A.minutes) * 11 },
      { key: "kp", label: "Key passes / 90 (XI)", home: per90(H.keyPasses, H.minutes) * 11, away: per90(A.keyPasses, A.minutes) * 11 },
      { key: "tk", label: "Tackles / 90 (XI)", home: per90(H.tackles, H.minutes) * 11, away: per90(A.tackles, A.minutes) * 11 },
      { key: "int", label: "Interceptions / 90 (XI)", home: per90(H.interceptions, H.minutes) * 11, away: per90(A.interceptions, A.minutes) * 11 },
    ];
  }, [source, homePlayers, awayPlayers, playerForm]);

  const title = source === "confirmed" ? "Tactical edge · Confirmed XI" : source === "predicted" ? "Tactical edge · Probable XI" : "Tactical edge";
  const titleTone = source === "predicted" ? "text-amber-300" : "";

  if (!source) {
    return (
      <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <header className="px-5 py-4 border-b border-border/60">
          <h2 className="font-semibold tracking-tight text-lg">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Awaiting lineup — projections rebuild as soon as the official or
            probable XI is published.
          </p>
        </header>
        <div className="p-8 text-center text-xs text-muted-foreground">
          No lineup available yet.
        </div>
      </section>
    );
  }

  const hasAny = rows.some((r) => r.home > 0 || r.away > 0);
  if (!hasAny) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className={`font-semibold tracking-tight text-lg ${titleTone}`}>{title}</h2>
          <p className="text-xs text-muted-foreground">
            Aggregated per-90 output from {homeTeam} vs {awayTeam}'s {source === "predicted" ? "predicted" : "announced"} XI over the last ~20 matches.
          </p>
        </div>
        {source === "predicted" && (
          <span className="text-[10px] uppercase tracking-[0.18em] rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 px-2 py-0.5">
            Probable
          </span>
        )}
      </header>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <DivergingStatBar
            key={r.key}
            label={r.label}
            home={r.home}
            away={r.away}
            format={(n) => n.toFixed(2)}
          />
        ))}
      </div>
    </section>
  );
}
