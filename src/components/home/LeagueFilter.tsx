import { useMemo } from "react";

import type { HomeBundleEvent } from "@/lib/bsd.functions";

export interface LeagueOption {
  id: number;
  label: string;
  count: number;
}

export function leagueOptionsFrom(events: HomeBundleEvent[]): LeagueOption[] {
  const map = new Map<number, LeagueOption>();
  for (const ev of events) {
    const id = ev.league_id;
    const label = ev.league_name
      ? ev.league_country
        ? `${ev.league_country} · ${ev.league_name}`
        : ev.league_name
      : `League #${ev.league_id}`;
    const cur = map.get(id);
    if (cur) cur.count += 1;
    else map.set(id, { id, label, count: 1 });
  }
  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

export function LeagueFilter({
  events,
  value,
  onChange,
}: {
  events: HomeBundleEvent[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const options = useMemo(() => leagueOptionsFrom(events), [events]);
  if (options.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
          value === null
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-border/60 text-muted-foreground hover:text-foreground"
        }`}
      >
        All <span className="font-mono">{events.length}</span>
      </button>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          title={o.label}
          className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition-colors max-w-[18ch] truncate ${
            value === o.id
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label} <span className="font-mono">{o.count}</span>
        </button>
      ))}
    </div>
  );
}
