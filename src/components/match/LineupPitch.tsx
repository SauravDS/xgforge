// Full-pitch lineup view. Renders both teams' starting XIs on a single SVG
// pitch, with subs in horizontal strips beneath each side. Tokens are
// jersey discs with AI-score ring, captain/vice markers, and a HoverCard
// popover that surfaces last-5 form data.

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { BsdEventLineups, BsdLineupPlayer, BsdPlayerDetail, BsdTeamLineup } from "@/lib/bsd-types";
import type { PlayerFormMap } from "@/lib/bsd.functions";
import {
  coordsForStarters,
  parseFormation,
  type PitchCoord,
} from "@/lib/formation-diagram";
import { computePlayerPer90, type PlayerPer90 } from "@/lib/lineup-per90";
import { RefreshCw } from "lucide-react";

const PITCH_W = 100;
const PITCH_H = 64;

export function LineupPitch({
  lineups,
  homeTeam,
  awayTeam,
  playerForm,
  playerDetail,
  isFetching,
  onRefresh,
  captainHomeId,
  viceHomeId,
  captainAwayId,
  viceAwayId,
}: {
  lineups: BsdEventLineups | null;
  homeTeam: string;
  awayTeam: string;
  playerForm: PlayerFormMap;
  playerDetail?: Record<string, BsdPlayerDetail>;
  isFetching: boolean;
  onRefresh: () => void;
  captainHomeId?: number | null;
  viceHomeId?: number | null;
  captainAwayId?: number | null;
  viceAwayId?: number | null;
}) {
  const status = lineups?.lineup_status ?? "unavailable";
  const home = lineups?.lineups?.home ?? null;
  const away = lineups?.lineups?.away ?? null;

  // Fallback shape for unavailable: a stylised 4-3-3 vs 4-3-3 ghost
  const fallback = status === "unavailable" || !home || !away;
  const homeFormation = parseFormation(home?.formation ?? "4-3-3");
  const awayFormation = parseFormation(away?.formation ?? "4-3-3");

  const homeStarters = home?.players ?? [];
  const awayStarters = away?.players ?? [];

  const homeCoords = coordsForStarters(homeFormation, homeStarters.length || 11, "home");
  const awayCoords = coordsForStarters(awayFormation, awayStarters.length || 11, "away");

  const updated =
    lineups?.updated_at &&
    new Date(lineups.updated_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border/60 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <SideHeader
            tone="bg-chart-1"
            team={homeTeam}
            formation={home?.formation ?? null}
            confidence={home?.confidence ?? null}
            status={status}
          />
          <span className="text-muted-foreground text-xs">vs</span>
          <SideHeader
            tone="bg-chart-2"
            team={awayTeam}
            formation={away?.formation ?? null}
            confidence={away?.confidence ?? null}
            status={status}
            align="right"
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} updated={updated} />
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded border border-border/60 px-2.5 py-1.5 hover:bg-surface-2/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Pitch */}
      <div className="relative bg-[var(--surface-1)]">
        <svg
          viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
          className="w-full h-auto block"
          style={{ aspectRatio: `${PITCH_W} / ${PITCH_H}` }}
          role="img"
          aria-label={`${homeTeam} vs ${awayTeam} lineup pitch`}
        >
          <PitchBackground />
          <PitchMarkings />

          {/* Starters */}
          {fallback ? (
            <GhostTokens />
          ) : (
            <>
              {homeStarters.map((p, i) => (
                <PlayerToken
                  key={`h-${p.id}`}
                  player={p}
                  coord={homeCoords[i] ?? { x: 25, y: 32 }}
                  side="home"
                  status={status}
                  isCaptain={p.id === captainHomeId}
                  isVice={p.id === viceHomeId}
                  per90={computePlayerPer90(p, playerForm)}
                  detail={playerDetail?.[String(p.id)] ?? null}
                />
              ))}
              {awayStarters.map((p, i) => (
                <PlayerToken
                  key={`a-${p.id}`}
                  player={p}
                  coord={awayCoords[i] ?? { x: 75, y: 32 }}
                  side="away"
                  status={status}
                  isCaptain={p.id === captainAwayId}
                  isVice={p.id === viceAwayId}
                  per90={computePlayerPer90(p, playerForm)}
                  detail={playerDetail?.[String(p.id)] ?? null}
                />
              ))}
            </>
          )}
        </svg>

        {fallback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-md border border-border/60 bg-card/85 backdrop-blur px-4 py-2.5 text-center max-w-xs">
              <div className="text-sm font-semibold">Lineup yet to be announced</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Showing a stylised probable shape · auto-refreshing every minute.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bench strips */}
      {!fallback && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60 border-t border-border/60">
          <BenchStrip side="home" team={home} playerForm={playerForm} />
          <BenchStrip side="away" team={away} playerForm={playerForm} />
        </div>
      )}
    </section>
  );
}

// ─── Pitch chrome ────────────────────────────────────────────────────────────

function PitchBackground() {
  // Mowing stripes — 10 alternating bands across the long axis.
  const stripes = [];
  const bandW = PITCH_W / 10;
  for (let i = 0; i < 10; i++) {
    stripes.push(
      <rect
        key={i}
        x={i * bandW}
        y={0}
        width={bandW}
        height={PITCH_H}
        fill={i % 2 === 0 ? "var(--surface-1)" : "var(--surface-2)"}
        opacity={0.55}
      />,
    );
  }
  return (
    <>
      <defs>
        <radialGradient id="turfVignette" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="var(--surface-2)" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <pattern id="turfGrain" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect width="2" height="2" fill="transparent" />
          <circle cx="0.5" cy="0.5" r="0.18" fill="var(--foreground)" opacity="0.04" />
        </pattern>
      </defs>
      <rect width={PITCH_W} height={PITCH_H} fill="var(--surface-1)" />
      {stripes}
      <rect width={PITCH_W} height={PITCH_H} fill="url(#turfGrain)" />
      <rect width={PITCH_W} height={PITCH_H} fill="url(#turfVignette)" />
    </>
  );
}

function PitchMarkings() {
  const lineColor = "var(--foreground)";
  const op = 0.32;
  return (
    <g
      fill="none"
      stroke={lineColor}
      strokeWidth={0.25}
      strokeOpacity={op}
      strokeLinejoin="round"
    >
      {/* outer boundary */}
      <rect x={0.5} y={0.5} width={PITCH_W - 1} height={PITCH_H - 1} />
      {/* halfway line */}
      <line x1={50} y1={0.5} x2={50} y2={PITCH_H - 0.5} />
      {/* centre circle */}
      <circle cx={50} cy={32} r={7.5} />
      <circle cx={50} cy={32} r={0.5} fill={lineColor} fillOpacity={op} />
      {/* left penalty area */}
      <rect x={0.5} y={14} width={14.5} height={36} />
      {/* left six-yard */}
      <rect x={0.5} y={23} width={5} height={18} />
      {/* left penalty spot + arc */}
      <circle cx={10} cy={32} r={0.4} fill={lineColor} fillOpacity={op} />
      <path d="M 14.5 27 A 6 6 0 0 1 14.5 37" />
      {/* right penalty area */}
      <rect x={PITCH_W - 15} y={14} width={14.5} height={36} />
      {/* right six-yard */}
      <rect x={PITCH_W - 5.5} y={23} width={5} height={18} />
      <circle cx={PITCH_W - 10} cy={32} r={0.4} fill={lineColor} fillOpacity={op} />
      <path d={`M ${PITCH_W - 14.5} 27 A 6 6 0 0 0 ${PITCH_W - 14.5} 37`} />
      {/* corner arcs */}
      <path d="M 0.5 1.5 A 1 1 0 0 1 1.5 0.5" />
      <path d={`M 0.5 ${PITCH_H - 1.5} A 1 1 0 0 0 1.5 ${PITCH_H - 0.5}`} />
      <path d={`M ${PITCH_W - 0.5} 1.5 A 1 1 0 0 0 ${PITCH_W - 1.5} 0.5`} />
      <path d={`M ${PITCH_W - 0.5} ${PITCH_H - 1.5} A 1 1 0 0 1 ${PITCH_W - 1.5} ${PITCH_H - 0.5}`} />
    </g>
  );
}

function GhostTokens() {
  // 4-3-3 ghost outline both sides
  const homeF = parseFormation("4-3-3");
  const awayF = parseFormation("4-3-3");
  const hc = coordsForStarters(homeF, 11, "home");
  const ac = coordsForStarters(awayF, 11, "away");
  return (
    <g>
      {hc.map((c, i) => (
        <circle
          key={`gh-${i}`}
          cx={c.x}
          cy={c.y}
          r={2.4}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth={0.4}
          strokeOpacity={0.35}
          strokeDasharray="0.6 0.6"
        />
      ))}
      {ac.map((c, i) => (
        <circle
          key={`ga-${i}`}
          cx={c.x}
          cy={c.y}
          r={2.4}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={0.4}
          strokeOpacity={0.35}
          strokeDasharray="0.6 0.6"
        />
      ))}
    </g>
  );
}

// ─── Tokens ──────────────────────────────────────────────────────────────────

function PlayerToken({
  player,
  coord,
  side,
  status,
  isCaptain,
  isVice,
  per90,
  detail,
}: {
  player: BsdLineupPlayer;
  coord: PitchCoord;
  side: "home" | "away";
  status: string;
  isCaptain?: boolean;
  isVice?: boolean;
  per90: PlayerPer90;
  detail?: BsdPlayerDetail | null;
}) {
  const ringColor = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  const aiScore = Math.max(0, Math.min(1, Number(player.ai_score ?? 0)));
  const dashed = status === "predicted";

  // AI ring is an arc proportional to ai_score. SVG circle stroke-dasharray
  // technique: full circumference for r=3.2 ≈ 20.106.
  const r = 3.2;
  const circ = 2 * Math.PI * r;
  const filled = circ * aiScore;

  // Captain "C" diamond at top-right of token
  const badgeOffsetX = 2.2;
  const badgeOffsetY = -2.2;

  return (
    <HoverCard openDelay={80} closeDelay={50}>
      <HoverCardTrigger asChild>
        <g
          transform={`translate(${coord.x}, ${coord.y})`}
          style={{ cursor: "pointer" }}
          tabIndex={0}
          className="focus:outline-none"
        >
          {/* Outer ring (club color) */}
          <circle
            cx={0}
            cy={0}
            r={r}
            fill="var(--background)"
            stroke={ringColor}
            strokeWidth={0.55}
            strokeOpacity={0.9}
            strokeDasharray={dashed ? "0.8 0.6" : undefined}
          />
          {/* AI score arc — overlays a portion of the ring */}
          {aiScore > 0 && (
            <circle
              cx={0}
              cy={0}
              r={r}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={0.7}
              strokeDasharray={`${filled} ${circ - filled}`}
              transform="rotate(-90)"
              strokeLinecap="round"
              opacity={0.9}
            />
          )}
          {/* Jersey number */}
          <text
            x={0}
            y={0.9}
            textAnchor="middle"
            fontSize={2.6}
            fontWeight={700}
            fill="var(--foreground)"
            className="font-mono"
            style={{ pointerEvents: "none" }}
          >
            {player.jersey_number ?? ""}
          </text>
          {/* Captain / Vice marker */}
          {(isCaptain || isVice) && (
            <g transform={`translate(${badgeOffsetX}, ${badgeOffsetY})`}>
              <rect
                x={-1}
                y={-1}
                width={2}
                height={2}
                fill="var(--primary)"
                transform="rotate(45)"
                rx={0.2}
              />
              <text
                x={0}
                y={0.55}
                textAnchor="middle"
                fontSize={1.55}
                fontWeight={800}
                fill="var(--primary-foreground)"
                style={{ pointerEvents: "none" }}
              >
                {isCaptain ? "C" : "V"}
              </text>
            </g>
          )}
          {/* Availability dot — bottom-left of disc */}
          {detail && detail.availability && detail.availability !== "available" && (
            <circle
              cx={-2.4}
              cy={2.4}
              r={0.75}
              fill={availabilityFill(detail.availability)}
              stroke="var(--background)"
              strokeWidth={0.18}
            >
              <title>{detail.availability}</title>
            </circle>
          )}
          {/* Name chip below token */}
          <g transform="translate(0, 5.4)">
            <rect
              x={-5}
              y={-1.4}
              width={10}
              height={2.6}
              rx={0.5}
              fill="var(--background)"
              fillOpacity={0.78}
              stroke="var(--border)"
              strokeWidth={0.12}
            />
            <text
              x={0}
              y={0.55}
              textAnchor="middle"
              fontSize={1.7}
              fill="var(--foreground)"
              style={{ pointerEvents: "none" }}
            >
              {shortName(player)}
            </text>
          </g>
        </g>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" side={side === "home" ? "right" : "left"}>
        <TokenPopover player={player} per90={per90} side={side} isCaptain={isCaptain} isVice={isVice} detail={detail ?? null} />
      </HoverCardContent>
    </HoverCard>
  );
}

function availabilityFill(status: string): string {
  const s = status.toLowerCase();
  if (s === "injured") return "rgb(239 68 68)"; // red-500
  if (s === "doubtful" || s === "doubt") return "rgb(245 158 11)"; // amber-500
  if (s === "suspended") return "rgb(168 85 247)"; // purple-500
  return "rgb(148 163 184)"; // slate-400 fallback
}

function shortName(p: BsdLineupPlayer): string {
  if (p.short_name) return p.short_name.length > 12 ? p.short_name.slice(0, 12) : p.short_name;
  const parts = p.name.split(" ");
  if (parts.length === 1) return parts[0].slice(0, 12);
  return `${parts[0][0]}. ${parts[parts.length - 1]}`.slice(0, 12);
}

function TokenPopover({
  player,
  per90,
  side,
  isCaptain,
  isVice,
  detail,
}: {
  player: BsdLineupPlayer;
  per90: PlayerPer90;
  side: "home" | "away";
  isCaptain?: boolean;
  isVice?: boolean;
  detail?: BsdPlayerDetail | null;
}) {
  const dotTone = side === "home" ? "bg-chart-1" : "bg-chart-2";
  const status = detail?.availability?.toLowerCase();
  const showStatus = status && status !== "available";
  return (
    <div>
      <div className="flex items-start gap-2 mb-2">
        <span className={`mt-1 h-2 w-2 rounded-sm shrink-0 ${dotTone}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-semibold text-sm truncate">{player.name}</span>
            {isCaptain && (
              <span className="text-[9px] uppercase tracking-wider rounded bg-primary/15 text-primary border border-primary/30 px-1">
                Captain
              </span>
            )}
            {isVice && !isCaptain && (
              <span className="text-[9px] uppercase tracking-wider rounded bg-muted/40 text-muted-foreground border border-border/60 px-1">
                Vice
              </span>
            )}
            {showStatus && (
              <span
                className="text-[9px] uppercase tracking-wider rounded px-1 border"
                style={{
                  borderColor: availabilityFill(status!),
                  color: availabilityFill(status!),
                  backgroundColor: `${availabilityFill(status!)}1a`,
                }}
              >
                {status}
              </span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">
            {String(player.position)} · #{player.jersey_number ?? "—"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">AI</div>
          <div className="font-mono text-sm tabular-nums text-primary font-semibold">
            {((player.ai_score ?? 0) * 100).toFixed(0)}
          </div>
        </div>
      </div>
      {per90.matches > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono tabular-nums">
          <StatLine label="Matches" v={per90.matches} fmt="int" />
          <StatLine label="Minutes" v={per90.minutes} fmt="int" />
          <StatLine label="xG/90" v={per90.xg90} />
          <StatLine label="xA/90" v={per90.xa90} />
          <StatLine label="Sh/90" v={per90.shots90} />
          <StatLine label="KP/90" v={per90.keyPasses90} />
          {String(player.position) === "G" ? (
            <StatLine label="Sv/90" v={per90.saves90} />
          ) : (
            <StatLine label="Tkl/90" v={per90.tackles90 + per90.interceptions90} />
          )}
          <StatLine label="Rating" v={per90.rating} />
        </dl>
      ) : (
        <p className="text-[11px] text-muted-foreground">No recent form data.</p>
      )}
    </div>
  );
}

function StatLine({ label, v, fmt }: { label: string; v: number; fmt?: "int" }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{fmt === "int" ? Math.round(v) : v.toFixed(2)}</dd>
    </div>
  );
}

// ─── Header strip pieces ─────────────────────────────────────────────────────

function SideHeader({
  tone,
  team,
  formation,
  confidence,
  status,
  align = "left",
}: {
  tone: string;
  team: string;
  formation: string | null;
  confidence: number | null;
  status: string;
  align?: "left" | "right";
}) {
  const showConfidence = status === "predicted" && confidence !== null;
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
      <div className={align === "right" ? "text-right" : ""}>
        <div className="font-semibold tracking-tight text-sm truncate max-w-[140px] sm:max-w-none">
          {team}
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] text-muted-foreground ${align === "right" ? "justify-end" : ""}`}>
          {formation && (
            <span className="font-mono rounded border border-border/60 bg-surface-2/40 px-1.5 py-0.5">
              {formation}
            </span>
          )}
          {showConfidence && (
            <span className="font-mono text-amber-300">
              {(confidence! * 100).toFixed(0)}% conf
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, updated }: { status: string; updated: string | undefined | null }) {
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Confirmed{updated ? ` · ${updated}` : ""}
      </span>
    );
  }
  if (status === "predicted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
        </span>
        Probable lineup
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-muted-foreground/50" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
      </span>
      Awaiting lineup
    </span>
  );
}

// ─── Bench strip ─────────────────────────────────────────────────────────────

function BenchStrip({
  side,
  team,
  playerForm,
}: {
  side: "home" | "away";
  team: BsdTeamLineup | null;
  playerForm: PlayerFormMap;
}) {
  if (!team) return <div className="p-4" />;
  const subs = team.substitutes ?? [];
  const tone = side === "home" ? "bg-chart-1" : "bg-chart-2";
  const ring = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block h-1.5 w-1.5 rounded-sm ${tone}`} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Bench · {subs.length}
        </span>
      </div>
      {subs.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">No bench announced.</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {subs.map((p) => (
            <BenchToken key={p.id} player={p} ringColor={ring} side={side} per90={computePlayerPer90(p, playerForm)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BenchToken({
  player,
  ringColor,
  side,
  per90,
}: {
  player: BsdLineupPlayer;
  ringColor: string;
  side: "home" | "away";
  per90: PlayerPer90;
}) {
  const aiScore = Math.max(0, Math.min(1, Number(player.ai_score ?? 0)));
  return (
    <HoverCard openDelay={80} closeDelay={50}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="shrink-0 w-[88px] rounded-md border border-border/60 bg-surface-1/50 px-2 py-1.5 text-left hover:bg-surface-2/60 transition opacity-80 hover:opacity-100"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold tabular-nums"
              style={{
                background: "var(--background)",
                border: `1.2px solid ${ringColor}`,
                color: "var(--foreground)",
              }}
            >
              {player.jersey_number ?? "—"}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {String(player.position)}
            </span>
            {aiScore > 0 && (
              <span className="ml-auto text-[10px] font-mono tabular-nums text-primary">
                {Math.round(aiScore * 100)}
              </span>
            )}
          </div>
          <div className="text-[11px] font-medium truncate mt-1">
            {player.short_name ?? player.name}
          </div>
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-64 p-3" side={side === "home" ? "right" : "left"}>
        <TokenPopover player={player} per90={per90} side={side} />
      </HoverCardContent>
    </HoverCard>
  );
}
