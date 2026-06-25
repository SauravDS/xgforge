// Lists players in either squad whose availability is anything other than
// "available". Pulls from the per-player detail map populated by getEventBundle.

import { AlertTriangle } from "lucide-react";

import type { BsdEventLineups, BsdLineupPlayer, BsdPlayerDetail } from "@/lib/bsd-types";

type Side = "home" | "away";

type Entry = {
  player: BsdLineupPlayer;
  side: Side;
  status: string;
  injuryRisk: string | null;
  isStarter: boolean;
};

export function DoubtWatch({
  lineups,
  playerDetail,
  homeTeam,
  awayTeam,
}: {
  lineups: BsdEventLineups | null;
  playerDetail: Record<string, BsdPlayerDetail>;
  homeTeam: string;
  awayTeam: string;
}) {
  const entries: Entry[] = [];

  const collect = (side: Side) => {
    const team = side === "home" ? lineups?.lineups?.home : lineups?.lineups?.away;
    if (!team) return;
    const starters = team.players ?? [];
    const subs = team.substitutes ?? [];
    for (const p of [...starters, ...subs]) {
      const d = playerDetail[String(p.id)];
      const status = (d?.availability ?? "").toLowerCase();
      if (!status || status === "available") continue;
      entries.push({
        player: p,
        side,
        status,
        injuryRisk: formatRisk(d?.injury_risk),
        isStarter: starters.some((s) => s.id === p.id),
      });
    }
  };
  collect("home");
  collect("away");

  if (entries.length === 0) return null;

  // Most urgent first: starters first, then by status severity.
  entries.sort((a, b) => severity(b) - severity(a));

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-300" />
        <h2 className="font-display text-xl tracking-tight">Doubt watch</h2>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {entries.length} player{entries.length === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="divide-y divide-border/60">
        {entries.map((e) => (
          <li key={`${e.side}-${e.player.id}`} className="flex items-center gap-3 px-5 py-2.5">
            <StatusDot status={e.status} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{e.player.name}</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {e.side === "home" ? homeTeam : awayTeam} · {String(e.player.position)} ·{" "}
                {e.isStarter ? "Starter" : "Bench"}
                {e.injuryRisk ? ` · risk ${e.injuryRisk}` : ""}
              </div>
            </div>
            <span
              className={`text-[10px] uppercase tracking-[0.16em] rounded border px-1.5 py-0.5 font-medium ${toneFor(e.status)}`}
            >
              {labelFor(e.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function severity(e: Entry): number {
  const base = e.isStarter ? 100 : 0;
  if (e.status === "injured") return base + 30;
  if (e.status === "doubtful" || e.status === "doubt") return base + 20;
  if (e.status === "suspended") return base + 25;
  return base + 10;
}

function labelFor(s: string): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toneFor(s: string): string {
  if (s === "injured") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (s === "doubtful" || s === "doubt") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (s === "suspended") return "border-purple-500/40 bg-purple-500/10 text-purple-300";
  return "border-border/60 bg-muted/30 text-muted-foreground";
}

function StatusDot({ status }: { status: string }) {
  const fill =
    status === "injured"
      ? "bg-red-400"
      : status === "doubtful" || status === "doubt"
        ? "bg-amber-400"
        : status === "suspended"
          ? "bg-purple-400"
          : "bg-muted-foreground";
  return <span className={`h-2 w-2 rounded-full shrink-0 ${fill}`} aria-hidden />;
}

function formatRisk(r: BsdPlayerDetail["injury_risk"]): string | null {
  if (r === null || r === undefined) return null;
  if (typeof r === "number") return `${Math.round(r * 100)}%`;
  return String(r);
}
