// Pressure heat-strip — two thin rows (home/away) with 5' buckets
// colored by intensity. Reads `buildPressureBuckets` output.

import type { PressureBucket } from "@/lib/match-derive";

export function PressureHeatStrip({
  buckets,
  homeLabel,
  awayLabel,
}: {
  buckets: PressureBucket[];
  homeLabel: string;
  awayLabel: string;
}) {
  if (!buckets.length) return null;
  const maxH = Math.max(0.5, ...buckets.map((b) => b.home));
  const maxA = Math.max(0.5, ...buckets.map((b) => b.away));
  const bucketSize = buckets.length >= 2 ? buckets[1].minute - buckets[0].minute : 5;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>Pressure intensity</span>
        <span className="font-mono">{bucketSize}' buckets</span>
      </div>
      <Row label={homeLabel} buckets={buckets} max={maxH} side="home" />
      <Row label={awayLabel} buckets={buckets} max={maxA} side="away" />
    </div>
  );
}

function Row({
  label,
  buckets,
  max,
  side,
}: {
  label: string;
  buckets: PressureBucket[];
  max: number;
  side: "home" | "away";
}) {
  const color = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-[11px] truncate" style={{ color }}>{label}</span>
      <div className="flex-1 h-5 flex gap-[2px]">
        {buckets.map((b, i) => {
          const v = side === "home" ? b.home : b.away;
          const intensity = v <= 0 ? 0 : 0.18 + 0.82 * (v / max);
          return (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{ background: color, opacity: intensity }}
              title={`${b.minute}–${b.minute + (buckets[1]?.minute ?? 5) - (buckets[0]?.minute ?? 0)}' · ${v.toFixed(1)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
