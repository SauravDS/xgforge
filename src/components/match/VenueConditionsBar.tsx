// Compact ribbon under the match header with venue, conditions, attendance.

import type { BsdVenueInfo, BsdWeather } from "@/lib/bsd-types";

function weatherIcon(code: number | null | undefined, desc?: string | null): string {
  const d = (desc ?? "").toLowerCase();
  if (d.includes("snow")) return "❄️";
  if (d.includes("rain") || (code != null && code >= 2 && code <= 4)) return "🌧";
  if (d.includes("cloud")) return "☁️";
  if (d.includes("clear") || d.includes("sun")) return "☀️";
  if (d.includes("fog") || d.includes("mist")) return "🌫";
  return "🌤";
}

export function VenueConditionsBar({
  venue,
  weather,
  attendance,
  variant = "card",
}: {
  venue: BsdVenueInfo | null;
  weather: BsdWeather | null | undefined;
  attendance?: number | null;
  variant?: "card" | "inline";
}) {
  if (!venue && !weather && !attendance) return null;
  const cap = venue?.capacity ? venue.capacity.toLocaleString() : null;
  const pitch =
    venue?.pitch_length_m && venue?.pitch_width_m
      ? `${venue.pitch_length_m}×${venue.pitch_width_m} m`
      : null;
  const className =
    variant === "inline"
      ? "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
      : "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border/60 bg-surface-1/40 px-3 py-2 text-[11px]";
  return (
    <div className={className}>
      {venue && (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted-foreground">📍</span>
          <span className="font-medium text-foreground">{venue.name}</span>
          {venue.city && <span className="text-muted-foreground">· {venue.city}</span>}
        </span>
      )}
      {cap && (
        <span className="text-muted-foreground font-mono tabular-nums">
          cap <span className="text-foreground">{cap}</span>
        </span>
      )}
      {pitch && (
        <span className="text-muted-foreground font-mono tabular-nums">
          pitch <span className="text-foreground">{pitch}</span>
        </span>
      )}
      {typeof attendance === "number" && attendance > 0 && (
        <span className="text-muted-foreground font-mono tabular-nums">
          att <span className="text-foreground">{attendance.toLocaleString()}</span>
        </span>
      )}
      {weather && (
        <span className={`inline-flex items-center gap-1.5 ${variant === "inline" ? "" : "ml-auto"}`}>
          <span>{weatherIcon(weather.code ?? null, weather.description)}</span>
          {weather.description && <span className="capitalize text-muted-foreground">{weather.description}</span>}
          {typeof weather.temperature_c === "number" && (
            <span className="font-mono tabular-nums text-foreground">{Math.round(weather.temperature_c)}°C</span>
          )}
          {typeof weather.wind_speed === "number" && (
            <span className="font-mono tabular-nums text-muted-foreground">wind {weather.wind_speed.toFixed(1)}</span>
          )}
        </span>
      )}
    </div>
  );
}
