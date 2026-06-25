import type { StandingsMap } from "@/lib/bsd.functions";

export function FormCompare({
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  standings,
}: {
  homeTeamId: number | undefined;
  awayTeamId: number | undefined;
  homeTeam: string;
  awayTeam: string;
  standings: StandingsMap;
}) {
  const h = homeTeamId !== undefined ? standings[String(homeTeamId)] : undefined;
  const a = awayTeamId !== undefined ? standings[String(awayTeamId)] : undefined;
  if (!h && !a) return null;
  return (
    <section className="rounded-xl border border-border/60 bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border/60">
        <h2 className="font-display text-xl tracking-tight">Form & table</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          League table position, season record and the last five results — quick
          context before kickoff.
        </p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/60">
        <TeamForm tone="bg-chart-1" team={homeTeam} row={h} />
        <TeamForm tone="bg-chart-2" team={awayTeam} row={a} />
      </div>
    </section>
  );
}

type Row = NonNullable<StandingsMap[string]>;

function TeamForm({
  tone,
  team,
  row,
}: {
  tone: string;
  team: string;
  row: Row | undefined;
}) {
  return (
    <div className="p-5">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-sm ${tone}`} />
        <h3 className="font-semibold tracking-tight">{team}</h3>
      </div>
      {!row ? (
        <p className="text-xs text-muted-foreground mt-3">
          League table data unavailable.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="P" value={row.played} />
            <Stat label="W" value={row.won} tone="text-up" />
            <Stat label="D" value={row.drawn} />
            <Stat label="L" value={row.lost} tone="text-down" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="GF" value={row.gf} />
            <Stat label="GA" value={row.ga} />
            <Stat
              label="GD"
              value={row.gf - row.ga}
              tone={
                row.gf - row.ga > 0
                  ? "text-up"
                  : row.gf - row.ga < 0
                    ? "text-down"
                    : undefined
              }
              signed
            />
          </div>
          {row.xgf !== null && row.xga !== null && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <Stat label="xGF" value={row.xgf} fmt="dec" />
              <Stat label="xGA" value={row.xga} fmt="dec" />
            </div>
          )}
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
              Last 5
            </div>
            <FormPills form={row.form} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  fmt,
  signed,
}: {
  label: string;
  value: number;
  tone?: string;
  fmt?: "int" | "dec";
  signed?: boolean;
}) {
  const v = fmt === "dec" ? value.toFixed(1) : `${signed && value > 0 ? "+" : ""}${value}`;
  return (
    <div className="rounded border border-border/60 bg-surface-2/40 py-1.5">
      <div
        className={`font-mono text-base tabular-nums ${tone ?? "text-foreground"}`}
      >
        {v}
      </div>
      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function FormPills({ form }: { form: string | null }) {
  if (!form) {
    return <span className="text-xs text-muted-foreground">No recent results.</span>;
  }
  const last5 = form.slice(-5).split("");
  return (
    <div className="flex gap-1.5">
      {last5.map((c, i) => {
        const tone =
          c === "W"
            ? "bg-up/30 text-up border-up/40"
            : c === "D"
              ? "bg-muted text-muted-foreground border-border/60"
              : "bg-down/30 text-down border-down/40";
        return (
          <span
            key={i}
            className={`inline-flex items-center justify-center h-6 w-6 rounded text-[11px] font-mono font-semibold border ${tone}`}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}
