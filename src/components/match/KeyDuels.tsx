// Three head-to-head duel cards selected from confirmed/predicted XIs:
//  1. Top attacker (home xG/90) vs top defender (away tackles+int/90)
//  2. Top creator (home xA/90) vs top creator (away xA/90)
//  3. Top AI score (home) vs top AI score (away)
// Each card shows two player faces with their per-90 metric bars.

import type { BsdLineupPlayer } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import { computeSidePer90, type PlayerPer90 } from "@/lib/lineup-per90";

export function KeyDuels({
  homePlayers,
  awayPlayers,
  playerForm,
  homeTeam,
  awayTeam,
}: {
  homePlayers: BsdLineupPlayer[];
  awayPlayers: BsdLineupPlayer[];
  playerForm: PlayerFormMap;
  homeTeam: string;
  awayTeam: string;
}) {
  const home = computeSidePer90(homePlayers, playerForm);
  const away = computeSidePer90(awayPlayers, playerForm);

  const homeAttack = pickBest(home, (p) => (isOutfield(p) ? p.xg90 + p.shots90 * 0.06 : -1));
  const awayDef = pickBest(away, (p) => (isOutfield(p) ? p.tackles90 + p.interceptions90 : -1));

  const homeCreator = pickBest(home, (p) => p.xa90 + p.keyPasses90 * 0.05);
  const awayCreator = pickBest(away, (p) => p.xa90 + p.keyPasses90 * 0.05);

  const homeAi = pickBest(homePlayers.map((p) => ({ ...p, _ai: p.ai_score ?? 0 })), (p) => p._ai);
  const awayAi = pickBest(awayPlayers.map((p) => ({ ...p, _ai: p.ai_score ?? 0 })), (p) => p._ai);

  const cards: { title: string; left: DuelFace | null; right: DuelFace | null }[] = [];

  if (homeAttack && awayDef) {
    cards.push({
      title: "Attack vs defence",
      left: faceFromPer90(homeAttack, "home", "xG/90", homeAttack.xg90, 1.2),
      right: faceFromPer90(awayDef, "away", "Tkl+Int/90", awayDef.tackles90 + awayDef.interceptions90, 8),
    });
  }
  if (homeCreator && awayCreator && (homeCreator.xa90 > 0 || awayCreator.xa90 > 0)) {
    cards.push({
      title: "Creators clash",
      left: faceFromPer90(homeCreator, "home", "xA/90", homeCreator.xa90, 0.8),
      right: faceFromPer90(awayCreator, "away", "xA/90", awayCreator.xa90, 0.8),
    });
  }
  if (homeAi && awayAi) {
    cards.push({
      title: "AI top picks",
      left: faceFromAi(homeAi, "home"),
      right: faceFromAi(awayAi, "away"),
    });
  }

  // Cross delivery — wingers / wide creators with the highest cross volume.
  const homeCrosser = pickBest(home, (p) => (isOutfield(p) ? p.crosses90 : -1));
  const awayCrosser = pickBest(away, (p) => (isOutfield(p) ? p.crosses90 : -1));
  if (homeCrosser && awayCrosser && (homeCrosser.crosses90 > 0 || awayCrosser.crosses90 > 0)) {
    cards.push({
      title: "Cross delivery",
      left: faceFromPer90(homeCrosser, "home", "Crosses/90", homeCrosser.crosses90, 6),
      right: faceFromPer90(awayCrosser, "away", "Crosses/90", awayCrosser.crosses90, 6),
    });
  }

  // Aerial duels — best aerial-winning outfield player per side. Tilt to
  // defenders/strikers (the duels that matter at set pieces and crosses).
  const aerialKey = (p: PlayerPer90) =>
    isOutfield(p) ? p.aerialWon90 + p.aerialWinRate * 2 : -1;
  const homeAerial = pickBest(home, aerialKey);
  const awayAerial = pickBest(away, aerialKey);
  if (homeAerial && awayAerial && (homeAerial.aerialWon90 > 0 || awayAerial.aerialWon90 > 0)) {
    cards.push({
      title: "Aerial battle",
      left: faceFromPer90(homeAerial, "home", "Aerial wins/90", homeAerial.aerialWon90, 6),
      right: faceFromPer90(awayAerial, "away", "Aerial wins/90", awayAerial.aerialWon90, 6),
    });
  }

  if (!cards.length) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Key duels</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {homeTeam} vs {awayTeam} · matchups likely to swing the result.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60">
        {cards.map((c, i) => (
          <DuelCard key={i} title={c.title} left={c.left} right={c.right} />
        ))}
      </div>
    </section>
  );
}

type DuelFace = {
  name: string;
  position: string;
  jersey: number | null;
  side: "home" | "away";
  metricLabel: string;
  metricValue: number;
  metricMax: number;
};

function faceFromPer90(p: PlayerPer90, side: "home" | "away", label: string, value: number, max: number): DuelFace {
  return {
    name: p.name,
    position: p.position,
    jersey: p.jersey_number,
    side,
    metricLabel: label,
    metricValue: value,
    metricMax: max,
  };
}

function faceFromAi(p: BsdLineupPlayer & { _ai: number }, side: "home" | "away"): DuelFace {
  return {
    name: p.name,
    position: String(p.position),
    jersey: p.jersey_number,
    side,
    metricLabel: "AI score",
    metricValue: p._ai,
    metricMax: 1,
  };
}

function pickBest<T>(list: T[], key: (item: T) => number): T | null {
  if (!list.length) return null;
  let best = list[0];
  let bestVal = key(best);
  for (const item of list) {
    const v = key(item);
    if (v > bestVal) {
      best = item;
      bestVal = v;
    }
  }
  return bestVal > 0 ? best : null;
}

function isOutfield(p: PlayerPer90): boolean {
  return p.position !== "G";
}

function DuelCard({ title, left, right }: { title: string; left: DuelFace | null; right: DuelFace | null }) {
  if (!left || !right) return <div className="p-5" />;
  return (
    <div className="p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">{title}</div>
      <DuelRow face={left} align="left" />
      <div className="my-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex-1 h-px bg-border/60" />
        <span>vs</span>
        <span className="flex-1 h-px bg-border/60" />
      </div>
      <DuelRow face={right} align="right" />
    </div>
  );
}

function DuelRow({ face, align }: { face: DuelFace; align: "left" | "right" }) {
  const ring = face.side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  const pct = Math.max(0.04, Math.min(1, face.metricValue / face.metricMax));
  const rev = align === "right";
  return (
    <div className={`flex items-center gap-3 ${rev ? "flex-row-reverse text-right" : ""}`}>
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs tabular-nums font-bold"
        style={{
          background: "var(--background)",
          border: `1.6px solid ${ring}`,
          color: "var(--foreground)",
        }}
      >
        {face.jersey ?? "—"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold text-sm truncate">{face.name}</span>
          <span className="text-[9px] uppercase rounded border border-border/60 px-1 text-muted-foreground">
            {face.position}
          </span>
        </div>
        <div className={`mt-1 flex items-center gap-2 ${rev ? "flex-row-reverse" : ""}`}>
          <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${pct * 100}%`,
                background: ring,
                marginLeft: rev ? "auto" : 0,
              }}
            />
          </div>
          <span className="font-mono text-[11px] tabular-nums shrink-0">
            {face.metricLabel === "AI score"
              ? Math.round(face.metricValue * 100)
              : face.metricValue.toFixed(2)}
          </span>
        </div>
        <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">
          {face.metricLabel}
        </div>
      </div>
    </div>
  );
}
