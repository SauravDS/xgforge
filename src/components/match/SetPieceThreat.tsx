// Set-piece threat: aggregate corners-against players' shot volume + xG
// signal from the lineup. Without explicit set-piece flags in BSD's row,
// we approximate set-piece danger via (shots90 × xG/shot adjustment) +
// keyPasses90 for set-piece-likely roles. Renders only if either side has
// non-zero signal.

import type { BsdLineupPlayer } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import { sumSideRaw } from "@/lib/lineup-per90";

export function SetPieceThreat({
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
  // Use centre-backs, midfielders and forwards (everyone except GK) since
  // they are the typical box presence. xG-from-set-pieces proxy: heading
  // chances correlate with (xg/shots ratio < threshold) AND aerial roles.
  // Without finer data, we proxy threat as: xG/90 contribution of D + M
  // (likely set-piece scorers) summed across each side.
  const h = sumSideRaw(homePlayers.filter((p) => String(p.position) !== "G" && String(p.position) !== "F"), playerForm);
  const a = sumSideRaw(awayPlayers.filter((p) => String(p.position) !== "G" && String(p.position) !== "F"), playerForm);
  const homeThreat = h.minutes > 0 ? (h.xg / h.minutes) * 90 * h.matches : 0;
  const awayThreat = a.minutes > 0 ? (a.xg / a.minutes) * 90 * a.matches : 0;

  if (homeThreat === 0 && awayThreat === 0) return null;
  const max = Math.max(homeThreat, awayThreat, 0.001);
  const homeW = (homeThreat / max) * 100;
  const awayW = (awayThreat / max) * 100;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-semibold tracking-tight text-sm">Set-piece threat</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          xG load · defenders + midfielders
        </span>
      </div>
      <ThreatRow team={homeTeam} value={homeThreat} pct={homeW} tone="var(--chart-1)" />
      <div className="h-2" />
      <ThreatRow team={awayTeam} value={awayThreat} pct={awayW} tone="var(--chart-2)" />
      <p className="text-[10px] text-muted-foreground mt-3">
        Proxy: cumulative xG from non-forwards over recent matches. A high reading flags box-presence threat from corners and free kicks.
      </p>
    </section>
  );
}

function ThreatRow({
  team,
  value,
  pct,
  tone,
}: {
  team: string;
  value: number;
  pct: number;
  tone: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium truncate">{team}</span>
        <span className="font-mono text-[11px] tabular-nums">{value.toFixed(2)} xG</span>
      </div>
      <div className="h-2 rounded-full bg-border/40 overflow-hidden">
        <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: tone, opacity: 0.9 }} />
      </div>
    </div>
  );
}
