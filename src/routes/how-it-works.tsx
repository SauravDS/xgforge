import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "Methodology — xG Forge" },
      {
        name: "description",
        content:
          "How xG Forge Rank works: per-90 xG scoring, opponent-adjusted form, team momentum, market priors and Monte Carlo match simulation.",
      },
      { property: "og:title", content: "Methodology — xG Forge" },
      {
        property: "og:description",
        content:
          "How xG Forge Rank works: per-90 xG scoring, opponent-adjusted form, team momentum, market priors and Monte Carlo match simulation.",
      },
      { property: "og:url", content: "https://xgforge.in/how-it-works" },
      { name: "twitter:title", content: "Methodology — xG Forge" },
      { name: "twitter:description", content: "How xG Forge Rank works: per-90 xG scoring, opponent-adjusted form, team momentum, market priors and Monte Carlo match simulation." },
    ],
    links: [{ rel: "canonical", href: "https://xgforge.in/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <header>
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
            Methodology
          </div>
          <h1 className="font-display text-5xl tracking-[0.01em]">How xG Forge works</h1>
          <p className="text-muted-foreground mt-3">
            A transparent, signal-rich football analytics engine. Every number on this site
            traces back to a stat we pulled, a weight we chose, or a simulation we ran.
          </p>
        </header>

        <Section title="1. Data we pull">
          For every fixture we fetch from our sports data provider:
        </Section>
        <ul className="list-disc pl-6 -mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li><strong>Lineups</strong> — confirmed XI + bench, plus each player's underlying <code className="font-mono text-xs">ai_score</code>.</li>
          <li><strong>Match prediction</strong> — home / draw / away win probabilities for team strength.</li>
          <li><strong>Per-player history</strong> — last ~20 matches: minutes, rating, goals, assists, xG/xA, shots, key passes, tackles, interceptions, saves, goals conceded, cards.</li>
          <li><strong>League standings</strong> — each team's recent form (WDWLW), goals for/against, xG for/against per match.</li>
          <li><strong>Market odds</strong> — 1X2, BTTS, O/U 2.5, Asian Handicap, Correct Score.</li>
        </ul>

        <Section title="2. Per-90 scoring">
          Every past appearance becomes a per-90 rate over a simplified scoring vector:
          appearance, goals (10/10/8/5 by position), assists (6), shots on target (1), key
          passes (1), tackles won (1), interceptions (1), saves (0.5), clean sheet
          (10 GK/D, 5 MID), goal conceded (−2 per 2 GK/D), yellow (−1), red (−3). xG and
          xA are blended in as forward-looking priors so a player isn't penalised for poor
          finishing variance.
        </Section>

        <Section title="3. The four projection signals">
          Each player gets four independent point estimates:
        </Section>
        <ul className="list-disc pl-6 -mt-4 space-y-2 text-sm text-muted-foreground">
          <li><strong>Form</strong> — per-90 over their last 5 played matches, scaled by expected minutes.</li>
          <li><strong>Season</strong> — same per-90 calc over the broader ~20-match window, smoothing out hot/cold streaks.</li>
          <li><strong>Team context</strong> — clean-sheet upside for GK/DEF (own xGA + opponent xGF), goal upside for MID/FWD (own xGF + opponent xGA).</li>
          <li><strong>AI signal</strong> — the opaque 0–1 vendor AI rating, scaled into the same point range as a sanity anchor.</li>
        </ul>

        <Section title="4. Blending → xG Forge Rank">
          The four signals are combined with fixed weights, then nudged by position, team
          strength and starter status:
        </Section>
        <pre className="rounded-lg border border-border/60 bg-background p-4 text-xs overflow-auto font-mono">{`projection = (0.45·form + 0.25·season + 0.15·team + 0.15·ai)
             × position_weight        // GK 1.00, DEF 1.05, MID 1.15, FWD 1.20
             × team_strength_mul      // 0.9..1.3 from match-win probability
             × starter_bonus          // 1.00 starter, 0.55 sub`}</pre>
        <p className="text-sm text-muted-foreground">
          Players with no history fold form/season weight into AI, so call-ups still rank.
        </p>

        <Section title="5. Ranking output">
          We sort every listed player (both squads, starters + subs) by blended projection.
          The top 11 is the suggestion, #1 is captain, #2 is vice. The remainder forms a
          ranked alternates list. Each card shows a breakdown bar so you see which signal
          drove the rank.
        </Section>

        <Section title="Coming next">
          Monte Carlo match simulation (5,000 Poisson runs anchored to market totals),
          per-player floor / ceiling distributions, market vs model edge scoring, and a
          public model card showing live MAE and captain hit-rate.
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border/60 bg-card p-6">
      <h2 className="text-lg font-semibold tracking-tight mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
    </section>
  );
}
