// Discipline & risk row: yellow/red per 90 for each XI's combined recent
// form, plus injury/suspension chips parsed from BSD's unavailable_players
// payload when present.

import type { BsdEventLineups, BsdLineupPlayer, Json } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import { sumSideRaw } from "@/lib/lineup-per90";

export function DisciplineRow({
  homePlayers,
  awayPlayers,
  playerForm,
  homeTeam,
  awayTeam,
  lineups,
}: {
  homePlayers: BsdLineupPlayer[];
  awayPlayers: BsdLineupPlayer[];
  playerForm: PlayerFormMap;
  homeTeam: string;
  awayTeam: string;
  lineups: BsdEventLineups | null;
}) {
  const h = sumSideRaw(homePlayers, playerForm);
  const a = sumSideRaw(awayPlayers, playerForm);

  const homeY = h.minutes > 0 ? (h.yellow / h.minutes) * 90 * 11 : 0;
  const awayY = a.minutes > 0 ? (a.yellow / a.minutes) * 90 * 11 : 0;
  const homeR = h.minutes > 0 ? (h.red / h.minutes) * 90 * 11 : 0;
  const awayR = a.minutes > 0 ? (a.red / a.minutes) * 90 * 11 : 0;

  const unavailable = parseUnavailable(lineups?.unavailable_players ?? null);
  const hasUnav = unavailable.home.length > 0 || unavailable.away.length > 0;

  if (h.minutes === 0 && a.minutes === 0 && !hasUnav) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-semibold tracking-tight text-sm">Discipline & risk</h2>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          per 90 (XI) · injuries from BSD
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SideBlock team={homeTeam} tone="var(--chart-1)" yellow={homeY} red={homeR} unav={unavailable.home} />
        <SideBlock team={awayTeam} tone="var(--chart-2)" yellow={awayY} red={awayR} unav={unavailable.away} />
      </div>
    </section>
  );
}

function SideBlock({
  team,
  tone,
  yellow,
  red,
  unav,
}: {
  team: string;
  tone: string;
  yellow: number;
  red: number;
  unav: UnavailableEntry[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: tone }} />
        <span className="font-semibold text-sm truncate">{team}</span>
      </div>
      <div className="flex gap-3 mb-3">
        <Tile tone="bg-yellow-500/20 text-yellow-300 border-yellow-500/40" label="Yellow/90" value={yellow.toFixed(2)} />
        <Tile tone="bg-rose-500/20 text-rose-300 border-rose-500/40" label="Red/90" value={red.toFixed(2)} />
      </div>
      {unav.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
            Out · {unav.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {unav.slice(0, 8).map((u, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded border border-border/60 bg-surface-1/60 px-1.5 py-0.5 text-[10px]"
                title={u.reason ?? "unavailable"}
              >
                <span className="font-medium truncate max-w-[100px]">{u.name}</span>
                {u.reason && (
                  <span className="text-muted-foreground">· {u.reason}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ tone, label, value }: { tone: string; label: string; value: string }) {
  return (
    <div className={`flex-1 rounded border px-2 py-1.5 ${tone}`}>
      <div className="font-mono text-sm tabular-nums leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.16em] opacity-80 mt-0.5">{label}</div>
    </div>
  );
}

type UnavailableEntry = { name: string; reason: string | null };

function parseUnavailable(raw: Json | null): { home: UnavailableEntry[]; away: UnavailableEntry[] } {
  const out = { home: [] as UnavailableEntry[], away: [] as UnavailableEntry[] };
  if (!raw) return out;
  const handle = (val: unknown, bucket: UnavailableEntry[]) => {
    if (!Array.isArray(val)) return;
    for (const v of val) {
      if (!v || typeof v !== "object") continue;
      const o = v as Record<string, unknown>;
      const name = String(o.name ?? o.player_name ?? "").trim();
      if (!name) continue;
      const reason =
        (o.reason as string | undefined) ??
        (o.status as string | undefined) ??
        (o.injury as string | undefined) ??
        null;
      bucket.push({ name, reason: reason ? String(reason) : null });
    }
  };
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    handle(o.home, out.home);
    handle(o.away, out.away);
  }
  return out;
}
