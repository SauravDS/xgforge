// Animated score that ring-pulses when either side scores.

import { useEffect, useRef, useState } from "react";

export function LiveScoreFlash({
  home,
  away,
}: {
  home: number;
  away: number;
}) {
  const prev = useRef({ home, away });
  const [flash, setFlash] = useState<"home" | "away" | null>(null);
  useEffect(() => {
    if (home > prev.current.home) setFlash("home");
    else if (away > prev.current.away) setFlash("away");
    prev.current = { home, away };
    if (flash !== null) {
      const t = setTimeout(() => setFlash(null), 1400);
      return () => clearTimeout(t);
    }
  }, [home, away, flash]);
  return (
    <div className="font-mono text-4xl sm:text-5xl tabular-nums">
      <span
        className={`inline-block transition-shadow duration-700 rounded ${flash === "home" ? "ring-2 ring-chart-1/70 shadow-[0_0_28px_var(--chart-1)]" : ""}`}
        style={{ padding: "0 4px" }}
      >
        {home}
      </span>
      <span className="px-3 text-muted-foreground">–</span>
      <span
        className={`inline-block transition-shadow duration-700 rounded ${flash === "away" ? "ring-2 ring-chart-2/70 shadow-[0_0_28px_var(--chart-2)]" : ""}`}
        style={{ padding: "0 4px" }}
      >
        {away}
      </span>
    </div>
  );
}
