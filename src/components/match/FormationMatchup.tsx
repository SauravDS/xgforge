// Formation matchup ribbon: shows both shapes and a one-line tactical read.

import { parseFormation, tacticalRead } from "@/lib/formation-diagram";

export function FormationMatchup({
  homeTeam,
  awayTeam,
  homeFormation,
  awayFormation,
}: {
  homeTeam: string;
  awayTeam: string;
  homeFormation: string | null;
  awayFormation: string | null;
}) {
  if (!homeFormation && !awayFormation) return null;
  const h = parseFormation(homeFormation);
  const a = parseFormation(awayFormation);
  const read = tacticalRead(h, a, homeTeam, awayTeam);

  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <FormationDots formation={h} side="home" />
          <span className="font-mono text-sm tabular-nums">{h.join("-")}</span>
        </div>
        <span className="text-muted-foreground text-xs">↔</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm tabular-nums">{a.join("-")}</span>
          <FormationDots formation={a} side="away" />
        </div>
        <div className="text-[11px] text-muted-foreground ml-auto max-w-md sm:text-right">
          {read}
        </div>
      </div>
    </section>
  );
}

function FormationDots({ formation, side }: { formation: number[]; side: "home" | "away" }) {
  const color = side === "home" ? "var(--chart-1)" : "var(--chart-2)";
  // Render as a tiny vertical mini-shape, each row a horizontal line of dots
  return (
    <svg width={48} height={26} viewBox="0 0 48 26" aria-hidden>
      {formation.map((count, rIdx) => {
        const rows = formation.length;
        const t = rows === 1 ? 0.5 : rIdx / (rows - 1);
        // For home, x grows left → right; for away mirror
        const x = side === "home" ? 6 + t * 36 : 42 - t * 36;
        return (
          <g key={rIdx}>
            {Array.from({ length: count }, (_, i) => {
              const y = ((i + 1) / (count + 1)) * 26;
              return <circle key={i} cx={x} cy={y} r={1.8} fill={color} opacity={0.85} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}
