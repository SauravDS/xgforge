// Bucketed momentum strip. Splits the match into N equal time buckets and
// renders a signed bar per bucket: positive = home advantage, negative
// = away advantage. Bars saturate by magnitude relative to the strongest
// bucket so the swing is read at a glance.
//
// Two input modes:
//   - `shots`  — xG-weighted shot events (preferred, real data)
//   - `pressure` — pre-bucketed weighted incident pressure (fallback when
//     no shot-level xG is streamed)

import { useMemo } from "react";

import type { PressureBucket, ShotEvent } from "@/lib/match-derive";

type Mode = "xg" | "pressure";

export function MomentumStrip({
  shots,
  pressure,
  matchMinute = 90,
  bucketMinutes = 10,
  height = 64,
  homeLabel = "Home",
  awayLabel = "Away",
}: {
  shots?: ShotEvent[];
  pressure?: PressureBucket[];
  matchMinute?: number;
  bucketMinutes?: number;
  height?: number;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const mode: Mode = shots && shots.length > 0 ? "xg" : "pressure";
  const { buckets, max, totalHome, totalAway, bucketSize } = useMemo(() => {
    if (mode === "xg" && shots && shots.length > 0) {
      const total = Math.max(matchMinute, 90);
      const count = Math.ceil(total / bucketMinutes);
      const arr = Array.from({ length: count }, () => ({ home: 0, away: 0 }));
      for (const s of shots) {
        const idx = Math.min(count - 1, Math.floor(s.minute / bucketMinutes));
        if (idx < 0) continue;
        if (s.team === "home") arr[idx].home += s.xg;
        else arr[idx].away += s.xg;
      }
      const signed = arr.map((b) => b.home - b.away);
      const m = Math.max(0.05, ...signed.map((v) => Math.abs(v)));
      return {
        buckets: signed,
        max: m,
        totalHome: arr.reduce((s, b) => s + b.home, 0),
        totalAway: arr.reduce((s, b) => s + b.away, 0),
        bucketSize: bucketMinutes,
      };
    }
    // pressure fallback
    const data = pressure ?? [];
    const signed = data.map((b) => b.home - b.away);
    const m = Math.max(0.5, ...signed.map((v) => Math.abs(v)));
    const size = data.length >= 2 ? data[1].minute - data[0].minute : 5;
    return {
      buckets: signed,
      max: m,
      totalHome: data.reduce((s, b) => s + b.home, 0),
      totalAway: data.reduce((s, b) => s + b.away, 0),
      bucketSize: size,
    };
  }, [mode, shots, pressure, matchMinute, bucketMinutes]);

  if (buckets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
        Momentum appears once both sides register events.
      </div>
    );
  }

  const unit = mode === "xg" ? "xG" : "pressure";
  const fmt = (v: number) =>
    mode === "xg" ? v.toFixed(2) : Math.round(v).toString();

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <h3 className="text-sm font-semibold tracking-tight">
          Momentum{" "}
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground ml-1">
            {mode === "xg" ? "xG" : "pressure proxy"} · {bucketSize}m
          </span>
        </h3>
        <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
          <span className="text-chart-1">{homeLabel.slice(0, 12)} {fmt(totalHome)}</span>
          <span className="px-1.5">·</span>
          <span className="text-chart-2">{awayLabel.slice(0, 12)} {fmt(totalAway)}</span>
        </div>
      </div>
      <div className="flex items-stretch gap-[3px]" style={{ height }}>
        {buckets.map((v, i) => {
          const pct = (Math.abs(v) / max) * 100;
          const positive = v >= 0;
          const intensity = 0.35 + 0.6 * (Math.abs(v) / max);
          return (
            <div
              key={i}
              className="flex-1 relative bg-border/15 rounded-sm overflow-hidden"
              title={`${i * bucketSize}–${(i + 1) * bucketSize}′ · ${v >= 0 ? "+" : ""}${fmt(v)} ${unit}`}
            >
              {positive ? (
                <div
                  className="absolute left-0 right-0 bottom-1/2"
                  style={{
                    height: `${pct / 2}%`,
                    background: "var(--chart-1)",
                    opacity: intensity,
                  }}
                />
              ) : (
                <div
                  className="absolute left-0 right-0 top-1/2"
                  style={{
                    height: `${pct / 2}%`,
                    background: "var(--chart-2)",
                    opacity: intensity,
                  }}
                />
              )}
              <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] font-mono text-muted-foreground tabular-nums">
        <span>0'</span>
        <span>45'</span>
        <span>90'</span>
      </div>
    </div>
  );
}
