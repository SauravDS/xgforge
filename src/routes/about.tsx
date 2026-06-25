import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowRight, Lock, Mail, Users, Zap } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — xG Forge" },
      {
        name: "description",
        content:
          "xG Forge is a live football intelligence platform: live xG, ranked squads, win probabilities, simulated outcomes, and market-vs-model views in one place.",
      },
      { property: "og:title", content: "About — xG Forge" },
      {
        property: "og:description",
        content:
          "Football, in numbers you can trust. Live xG, ranked squads, simulated outcomes, and market-vs-model views.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:py-16 space-y-20 sm:space-y-28">
        <Hero />
        <WhatItIs />
        <WhatYouGet />
        <ByTheNumbers />
        <ContactCTA />
      </main>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-1">
      {/* Pitch-line texture */}
      <div className="absolute inset-0 pitch-lines opacity-60" aria-hidden="true" />

      {/* Soft radial glow */}
      <div
        className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-accent/5 blur-3xl"
        aria-hidden="true"
      />

      {/* Decorative pitch outline */}
      <svg
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:block h-[80%] w-auto text-border/20"
        viewBox="0 0 320 420"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="10" y="10" width="300" height="400" rx="4" />
        <line x1="10" y1="210" x2="310" y2="210" />
        <circle cx="160" cy="210" r="48" />
        <rect x="110" y="10" width="100" height="48" rx="2" />
        <rect x="110" y="362" width="100" height="48" rx="2" />
      </svg>

      <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-24 lg:py-32">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            About xG Forge
          </div>

          <h1 className="mt-6 font-display text-5xl sm:text-6xl lg:text-7xl tracking-[0.01em] leading-[0.92]">
            Football,
            <br />
            <span className="text-primary">in numbers</span>
            <br />
            you can trust.
          </h1>

          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            xG Forge is a live football intelligence platform. Live scores, ranked squads, win
            probabilities, simulated scorelines, and market-vs-model views — every match, every
            league, all in one place. For fans who want more than the final whistle.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              See live matches
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:contacts@xgforge.in"
              className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              <Mail className="h-4 w-4 text-primary" />
              contacts@xgforge.in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatItIs() {
  return (
    <section className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-3">
          What xG Forge is
        </div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-[0.01em] leading-none">
          One screen for the whole match.
        </h2>
      </div>

      <div className="lg:col-span-8 space-y-5 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          <span className="text-foreground font-medium">xG Forge turns every fixture into a single, readable view.</span>{" "}
          Live xG, momentum, win probability, lineups, ranked players, and key duels — all on one
          page, refreshing as the match unfolds.
        </p>
        <p>
          For matches that haven&apos;t kicked off yet, xG Forge projects scorelines, simulates the
          90 minutes thousands of times, and shows where the model disagrees with the betting
          market — so you can see edge, not just opinion.
        </p>
        <p>
          For finished matches, xG Forge keeps the receipts: shot quality, ratings, set-piece
          threat, and how the story actually played out versus how it was supposed to.
        </p>
      </div>
    </section>
  );
}

function WhatYouGet() {
  const features = [
    {
      icon: Activity,
      title: "Live match intelligence",
      body: "Live xG, momentum, and win probability that updates as the match unfolds — not five minutes late.",
    },
    {
      icon: Lock,
      title: "Every match, every league",
      body: "Premier club leagues, continental cups, internationals, and qualifiers — coverage that follows the calendar.",
    },
    {
      icon: Users,
      title: "Ranked squads & key duels",
      body: "Per-player ratings, lineups on the pitch, formation matchups, and the duels that will decide the result.",
    },
    {
      icon: Zap,
      title: "Model vs market",
      body: "Simulated scorelines, projected outcomes, and a side-by-side view of model probabilities against bookmaker odds.",
    },
  ];

  return (
    <section>
      <header className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
          What you get
        </div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-[0.01em] leading-none">
          The full match, at a glance.
        </h2>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((v) => (
          <div
            key={v.title}
            className="group rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/30"
          >
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-surface-1 text-primary">
              <v.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display text-xl tracking-wide">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ByTheNumbers() {
  const stats = [
    { value: "90", label: "minutes of live coverage" },
    { value: "1000s", label: "fixtures tracked" },
    { value: "5", label: "continents covered" },
    { value: "1", label: "game we love" },
  ];

  return (
    <section className="rounded-2xl border border-border/60 bg-surface-1 p-6 sm:p-10 lg:p-14 pitch-lines">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-3">
            By the numbers
          </div>
          <h2 className="font-display text-4xl sm:text-5xl tracking-[0.01em] leading-none">
            The game is a data problem. xG Forge solves it one fixture at a time.
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border/60 bg-card/60 p-5"
            >
              <div className="font-mono text-4xl font-semibold text-primary tabular-nums">
                {s.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactCTA() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface-1 p-8 sm:p-12 lg:p-16">
      <div
        className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -left-24 -bottom-24 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <h2 className="font-display text-4xl sm:text-5xl tracking-[0.01em] leading-none">
            Questions or feedback?
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Spotted something off, missing a league, or want to suggest a feature? Reach out —
            xG Forge gets better with every note from the people who use it.
          </p>
        </div>

        <a
          href="mailto:contacts@xgforge.in"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Mail className="h-4 w-4" />
          Contact us
        </a>
      </div>
    </section>
  );
}
