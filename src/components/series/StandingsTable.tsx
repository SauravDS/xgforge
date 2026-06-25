// Shared standings table used by the homepage League Pulse cards and the
// series detail page. Pass `compact` to drop the extra columns when space
// is tight (the homepage grid only has room for #, team, P, GD, Pts, Form).

import { Sparkline } from "@/components/charts/Sparkline";
import type { PulseStandingRow } from "@/lib/bsd.functions";

export function StandingsTable({
  rows,
  compact = false,
}: {
  rows: PulseStandingRow[];
  compact?: boolean;
}) {
  if (!rows.length) return null;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <th className="text-left font-normal px-4 py-2 w-6">#</th>
          <th className="text-left font-normal px-2 py-2">Team</th>
          <th className="text-right font-normal px-2 py-2 w-8">P</th>
          {!compact && <th className="text-right font-normal px-2 py-2 w-8">W</th>}
          {!compact && <th className="text-right font-normal px-2 py-2 w-8">D</th>}
          {!compact && <th className="text-right font-normal px-2 py-2 w-8">L</th>}
          {!compact && <th className="text-right font-normal px-2 py-2 w-12">GF</th>}
          {!compact && <th className="text-right font-normal px-2 py-2 w-12">GA</th>}
          <th className="text-right font-normal px-2 py-2 w-10">GD</th>
          <th className="text-right font-normal px-4 py-2 w-10">Pts</th>
          <th className="text-right font-normal px-4 py-2 w-16">Form</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.team_id || r.rank}-${r.team_name}`} className="border-t border-border/40">
            <td className="px-4 py-1.5 text-muted-foreground font-mono tabular-nums">{r.rank}</td>
            <td className="px-2 py-1.5 truncate max-w-[14rem]">{r.team_name}</td>
            <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
              {r.played}
            </td>
            {!compact && (
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {r.won}
              </td>
            )}
            {!compact && (
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {r.drawn}
              </td>
            )}
            {!compact && (
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {r.lost}
              </td>
            )}
            {!compact && (
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {r.gf}
              </td>
            )}
            {!compact && (
              <td className="px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {r.ga}
              </td>
            )}
            <td
              className={`px-2 py-1.5 text-right font-mono tabular-nums ${
                r.gd > 0 ? "text-up" : r.gd < 0 ? "text-down" : "text-muted-foreground"
              }`}
            >
              {r.gd > 0 ? "+" : ""}
              {r.gd}
            </td>
            <td className="px-4 py-1.5 text-right font-mono font-semibold tabular-nums">
              {r.points}
            </td>
            <td className="px-4 py-1.5 text-right">
              <FormCell form={r.form} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FormCell({ form }: { form: string | null }) {
  if (!form) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const chars = form.slice(-5).split("");
  const values = chars.map((c) => (c === "W" ? 3 : c === "D" ? 1 : 0));
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <Sparkline values={values} width={42} height={14} className="text-primary" />
      <span className="hidden sm:flex gap-0.5">
        {chars.map((c, i) => (
          <span
            key={i}
            className={`inline-block w-3 h-3 rounded-sm text-[8px] leading-3 text-center font-mono ${
              c === "W"
                ? "bg-up/30 text-up"
                : c === "D"
                  ? "bg-muted text-muted-foreground"
                  : "bg-down/30 text-down"
            }`}
          >
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}
