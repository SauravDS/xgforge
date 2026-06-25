import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import type { HomeBundleEvent } from "@/lib/bsd.functions";
import type { CardEnrichment, TeamForm } from "@/lib/home-enrichments.functions";

import { FormPills, PairBar, ProbBar } from "./CardEnrichments";

function formatKickoff(iso: string): string {
  const d = new Date(iso);
  const dayDiff = Math.floor((d.getTime() - Date.now()) / 86400000);
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (dayDiff <= 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${time}`;
}

function CardLeagueLine({
  name,
  kind,
  country,
}: {
  name: string;
  kind?: string;
  country?: string;
}) {
  const kindLabel =
    kind === "international"
      ? "Intl"
      : kind === "club-continental"
        ? "Continental"
        : kind === "club-domestic"
          ? "Domestic"
          : "";
  return (
    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
      <span className="truncate">
        {country ? `${country} · ` : ""}
        {name}
      </span>
      {kindLabel && (
        <span className="ml-2 shrink-0 border border-border/60 rounded px-1.5 py-0.5 text-[9px]">
          {kindLabel}
        </span>
      )}
    </div>
  );
}

function TeamRow({
  name,
  side,
  form,
}: {
  name: string;
  side: "home" | "away";
  form?: TeamForm;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={`inline-block h-2 w-2 rounded-sm ${
            side === "home" ? "bg-chart-1" : "bg-chart-2"
          }`}
        />
        <span className="truncate text-sm">{name}</span>
      </span>
      <FormPills form={form?.form} rank={form?.rank} />
    </div>
  );
}

export function FixtureCard({
  ev,
  enr,
  homeForm,
  awayForm,
}: {
  ev: HomeBundleEvent;
  enr?: CardEnrichment;
  homeForm?: TeamForm;
  awayForm?: TeamForm;
}) {
  const ko = formatKickoff(ev.event_date);
  const fav =
    enr?.prob &&
    (enr.prob.home > enr.prob.away + 0.06
      ? ("home" as const)
      : enr.prob.away > enr.prob.home + 0.06
        ? ("away" as const)
        : ("even" as const));
  return (
    <Link
      to="/match/$eventId"
      params={{ eventId: String(ev.id) }}
      className="group block rounded-lg border border-border/60 bg-card hover:border-primary/50 hover:bg-surface-2/40 transition-colors p-4"
    >
      <CardLeagueLine
        name={ev.league_name ?? `League #${ev.league_id}`}
        kind={ev.league_kind}
        country={ev.league_country}
      />
      <div className="mt-3 space-y-1.5">
        <TeamRow name={ev.home_team} side="home" form={homeForm} />
        <TeamRow name={ev.away_team} side="away" form={awayForm} />
      </div>

      {enr?.prob && (
        <div className="mt-3.5">
          <ProbBar prob={enr.prob} />
        </div>
      )}

      {enr?.expGoals && (
        <div className="mt-2.5">
          <PairBar label="xG forecast" pair={enr.expGoals} fmt="dec1" />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className="font-mono text-muted-foreground">{ko}</span>
        <span className="inline-flex items-center gap-1.5">
          {fav && fav !== "even" && enr?.prob && (
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary/80">
              {fav === "home" ? ev.home_team.split(" ")[0] : ev.away_team.split(" ")[0]}{" "}
              {Math.round(
                ((fav === "home" ? enr.prob.home : enr.prob.away) /
                  (enr.prob.home + enr.prob.draw + enr.prob.away)) *
                  100,
              )}
              %
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-primary opacity-70 group-hover:opacity-100 transition-opacity">
            Open
            <ArrowUpRight className="h-3 w-3" />
          </span>
        </span>
      </div>
    </Link>
  );
}
