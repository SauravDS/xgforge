// Compact strip of contextual chips surfacing untapped event-detail fields:
// derby, neutral venue, away travel km, weather/pitch, attendance vs capacity,
// competition stage. Renders nothing when there's no signal at all.

import type { ReactNode } from "react";
import { Cloud, Plane, MapPin, Calendar, Users } from "lucide-react";

import type { BsdEventListItem, BsdVenueInfo } from "@/lib/bsd-types";

export function MatchContextChips({
  event,
  venue,
}: {
  event: BsdEventListItem | null;
  venue: BsdVenueInfo | null;
}) {
  if (!event) return null;

  const chips: { key: string; icon: ReactNode; label: string; tone?: "primary" | "warn" | "muted" }[] = [];

  // Competition stage (round / group)
  const stage = formatStage(event);
  if (stage) {
    chips.push({ key: "stage", icon: <Calendar className="h-3 w-3" />, label: stage, tone: "primary" });
  }

  if (event.is_local_derby) {
    chips.push({ key: "derby", icon: <span aria-hidden>⚔️</span>, label: "Local derby", tone: "warn" });
  }
  if (event.is_neutral_ground) {
    chips.push({ key: "neutral", icon: <MapPin className="h-3 w-3" />, label: "Neutral venue" });
  }

  if (typeof event.travel_distance_km === "number" && event.travel_distance_km > 0) {
    chips.push({
      key: "travel",
      icon: <Plane className="h-3 w-3" />,
      label: `Away travel · ${Math.round(event.travel_distance_km).toLocaleString()} km`,
    });
  }

  const weatherLabel = formatWeather(event.weather);
  if (weatherLabel) {
    chips.push({ key: "weather", icon: <Cloud className="h-3 w-3" />, label: weatherLabel });
  }

  if (event.pitch_condition) {
    chips.push({
      key: "pitch",
      icon: <span aria-hidden>🌱</span>,
      label: `Pitch · ${event.pitch_condition}`,
    });
  }

  const attLabel = formatAttendance(event.attendance, venue?.capacity ?? null);
  if (attLabel) {
    chips.push({ key: "att", icon: <Users className="h-3 w-3" />, label: attLabel });
  }

  if (chips.length === 0) return null;

  return (
    <section className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Chip key={c.key} tone={c.tone}>
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/70">{c.icon}</span>
            <span>{c.label}</span>
          </span>
        </Chip>
      ))}
    </section>
  );
}

function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "primary" | "warn" | "muted";
}) {
  const cls =
    tone === "primary"
      ? "border-primary/40 bg-primary/10 text-primary"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-border/60 bg-card/60 text-foreground/80";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function formatStage(ev: BsdEventListItem): string | null {
  const parts: string[] = [];
  if (ev.round_name) parts.push(ev.round_name);
  else if (typeof ev.round_number === "number") parts.push(`Matchday ${ev.round_number}`);
  if (ev.group_name) parts.push(`Group ${ev.group_name}`);
  return parts.length ? parts.join(" · ") : null;
}

function formatWeather(w: BsdEventListItem["weather"]): string | null {
  if (!w) return null;
  const bits: string[] = [];
  if (w.description) bits.push(w.description);
  if (typeof w.temperature_c === "number") bits.push(`${Math.round(w.temperature_c)}°C`);
  if (typeof w.wind_speed === "number" && w.wind_speed > 0)
    bits.push(`${Math.round(w.wind_speed)} km/h wind`);
  return bits.length ? bits.join(" · ") : null;
}

function formatAttendance(
  attendance: number | null | undefined,
  capacity: number | null | undefined,
): string | null {
  if (!attendance && !capacity) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
  if (attendance && capacity) {
    const pct = Math.round((attendance / capacity) * 100);
    return `${fmt(attendance)} / ${fmt(capacity)} (${pct}%)`;
  }
  if (attendance) return `${fmt(attendance)} expected`;
  if (capacity) return `Capacity · ${fmt(capacity)}`;
  return null;
}
