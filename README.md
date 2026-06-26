# xG Forge

**Live football intelligence — xG, ranked squads, match simulation, and model vs market edge.**

xG Forge is a full-stack football analytics platform that turns raw match data into something actually useful. Live xG, win probabilities, player rankings, Monte Carlo scoreline simulation, and a clean side-by-side view of what the model thinks against what the bookmakers are pricing — all on one page, updating as the match runs.

---

## What it does

### Live match view
Every live fixture gets a dedicated match page that refreshes automatically. The page surfaces:

- **xG timeline** — cumulative expected-goals curve for both sides, rebuilt from shot-level data
- **Win probability** — a Bayesian in-play estimate that updates with each new incident
- **Momentum strip** — 5-minute rolling xG windows so you can see who is dominating possession phases
- **Live player ratings** — synthesised from incident data (goals, assists, key passes, errors, saves) anchored to each player's pre-match baseline
- **Shot map** — pitch-positioned markers for every attempt, colour-coded by xG value
- **Key duels** — the one-on-one matchups that are most likely to decide the result, surfaced automatically

### Pre-match view
Before kickoff, the same match page switches to a pre-match mode:

- **Lineup pitch** — both confirmed or predicted XIs on a rendered pitch, with jersey numbers and formation
- **xG Forge Rank** — each player ranked by a blended projection (see [methodology](#methodology))
- **Squad explorer** — filter and sort all 22 starters and the bench
- **Goals forecast** — bar chart of most likely scorelines from Monte Carlo simulation
- **Scoreline matrix** — full probability heatmap across all plausible scorecodes
- **Odds vs model** — 1X2, BTTS, O/U 2.5, and correct score; model probability next to best available market price
- **Head-to-head strip** — historical record between the two sides
- **Manager matchup** — tactical profile and stats for both coaches
- **Set piece threat** — teams ranked by dead-ball danger, both attacking and defensive
- **Discipline risk** — referee card rates and which players are booking-risk
- **Venue & conditions** — stadium details, weather, pitch condition

### Series / competition view
Browse every active league and tournament. Each series page shows the current standings table and lists all fixtures in that competition window.

### Home feed
The home page surfaces three rails — live now, upcoming, and last 48 hours — with a league filter on each. A MiniMatchCenter at the top gives a scrollable quick-scan of the most important live fixtures. A League Pulse section shows table snapshots across the major leagues.

---

## Tech stack

| Layer | What |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based SSR routing) |
| Router | TanStack Router v1 with type-safe file routes |
| Data fetching | TanStack Query v5 — prefetch in loader, hydrate on client, polling on live pages |
| Charts | [visx](https://airbnb.io/visx/) (xG timeline, momentum, sparklines, radar, heatmap) + Recharts |
| UI primitives | Radix UI, class-variance-authority, Lucide icons |
| Styling | Tailwind CSS v4 with a custom design token layer |
| Server | Nitro (Vercel preset) with per-route `Cache-Control` headers tuned for live vs static data |
| Language | TypeScript throughout — strict mode |
| Tooling | Vite 8, Bun, ESLint + Prettier |

---

## Project layout

```
src/
├── lib/                        # All logic — no React, no JSX
│   ├── bsd-client.server.ts    # API client (server-only, never sent to browser)
│   ├── bsd-types.ts            # TypeScript interfaces for API response shapes
│   ├── bsd.functions.ts        # Server functions — fetch, normalise, cache
│   ├── live-derive.ts          # Live match helpers: clock, win probability, ratings
│   ├── match-derive.ts         # Incident parsing, xG accumulation, match-script tags
│   ├── match-stats.ts          # Stat aggregation — shots, pressure, territory
│   ├── ranking-engine.ts       # xG Forge Rank blending: form × season × team × AI
│   ├── scoring.ts              # Per-90 fantasy-points scoring vector
│   ├── simulator.ts            # 5,000-run Poisson Monte Carlo simulator
│   ├── odds.ts                 # Market odds parsing and model-vs-market diff
│   ├── formation-diagram.ts    # Pitch coordinate mapping for lineup rendering
│   ├── league-popularity.ts    # Priority tier for league display ordering
│   ├── league-scope.ts         # Premium/international league classification
│   └── ...
│
├── routes/                     # One file = one URL (TanStack Start convention)
│   ├── __root.tsx              # App shell — QueryClient, fonts, global layout
│   ├── index.tsx               # Home feed (/)
│   ├── live.tsx                # Live matches (/live)
│   ├── upcoming.tsx            # Upcoming fixtures (/upcoming)
│   ├── recent.tsx              # Finished results (/recent)
│   ├── match.$eventId.tsx      # Match detail (/match/:id)
│   ├── series.tsx              # Series layout
│   ├── series.index.tsx        # Series browser (/series)
│   ├── series.$seriesId.tsx    # Series detail (/series/:id)
│   ├── about.tsx               # About page
│   ├── how-it-works.tsx        # Methodology page
│   ├── privacy.tsx             # Privacy policy
│   └── terms.tsx               # Terms of service
│
└── components/
    ├── SiteHeader.tsx          # Top nav — responsive, scroll-aware
    ├── SiteFooter.tsx          # Footer with links
    ├── home/                   # Home-page cards and panels
    ├── match/                  # All match-page components (37 files)
    ├── series/                 # Standings table
    ├── charts/                 # Reusable visx/Recharts wrappers
    └── ui/                     # Radix-backed primitives (button, badge, dialog, …)
```

---

## Methodology

### Data inputs
For every fixture we pull from our sports data provider:

- **Lineups** — confirmed XI + bench, each with an underlying AI signal score (0–1)
- **Match prediction** — home / draw / away win probabilities used as team-strength priors
- **Per-player history** — ~20 most recent appearances: minutes, rating, goals, assists, xG, xA, shots, key passes, tackles, interceptions, saves, goals conceded, cards
- **League standings** — recent form string (WDWLW), goals for/against, xG for/against per game
- **Market odds** — 1X2, BTTS, Over/Under 2.5, Asian Handicap, Correct Score

### Per-90 scoring
Each historical appearance is converted to a fantasy-style point score, then normalised to a per-90 rate:

| Action | Points |
|---|---|
| Appearance ≥ 60 min | +4 |
| Appearance 1–59 min | +2 |
| Goal (GK / DEF) | +10 |
| Goal (MID) | +8 |
| Goal (FWD) | +5 |
| Assist | +6 |
| Shot on target | +1 |
| Key pass | +1 |
| Tackle won | +1 |
| Interception | +1 |
| Save | +0.5 |
| Clean sheet ≥ 60 min (GK/DEF) | +10 |
| Clean sheet ≥ 60 min (MID) | +5 |
| Per 2 goals conceded (GK/DEF) | −2 |
| Yellow card | −1 |
| Red card | −3 |

### The four projection signals
Each player gets four independent estimates:

1. **Form** — per-90 over last 5 appearances with minutes > 0, scaled by expected minutes
2. **Season** — same calculation over the broader ~20-match window to smooth variance
3. **Team context** — clean-sheet upside for GK/DEF (own xGA + opp xGF), goal upside for MID/FWD (own xGF + opp xGA)
4. **AI signal** — vendor 0–1 rating scaled into the same points range as a sanity anchor

### Blending → xG Forge Rank

```
projection = (0.45 × form  +  0.25 × season  +  0.15 × team  +  0.15 × ai)
           × position_weight     // GK 1.00 · DEF 1.05 · MID 1.15 · FWD 1.20
           × team_strength_mul   // 0.9 – 1.3 derived from match win probability
           × starter_bonus       // 1.00 starter · 0.55 sub
```

Players with no historical data fold form + season weight into AI so call-ups still rank sensibly.

### Match simulation
Pre-match scoreline probabilities use a 5,000-run Monte Carlo Poisson simulation. Goal rates (λ_home, λ_away) are derived from match win probabilities and a league-average total-goals baseline. Each run independently samples home and away goals from their respective Poisson distributions. The simulation is deterministic given the same inputs (seeded PRNG) so results are stable across refreshes.

---

## Running locally

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. You need a `BSD_API_KEY` environment variable set — put it in `.env` at the project root (this file is gitignored).

```
BSD_API_KEY=your_key_here
```

### Other commands

```bash
npm run build          # Production build
npm run build:dev      # Development build (no minification)
npm run preview        # Preview the production build locally
npm run lint           # ESLint
npm run format         # Prettier
```

---

## Caching strategy

Server functions run behind Nitro with tuned `Cache-Control` headers at the edge:

| Endpoint | s-maxage | stale-while-revalidate |
|---|---|---|
| Home mini bundle (live counts) | 30 s | 60 s |
| Home full bundle | 30 s | 120 s |
| Upcoming events | 60 s | 180 s |
| Match bundle (live) | 20 s | 40 s |
| Series / league lists | 600 s | 600 s |

Live match pages poll every 30 seconds when a match is in progress, falling back to 5 minutes when nothing is live.

---

## Deployment

The app deploys to Vercel. `vite.config.ts` uses `nitro: { preset: "vercel" }` — no additional config needed. Push to the connected branch and Vercel picks it up automatically.

---

## Contact

Questions, missing leagues, or feature ideas: **contacts@xgforge.in**
