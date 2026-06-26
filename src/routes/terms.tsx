import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — xG Forge" },
      {
        name: "description",
        content:
          "The terms that govern your use of xG Forge — a scientific football analytics platform. Read before relying on any number on the site.",
      },
      { property: "og:title", content: "Terms of Use — xG Forge" },
      {
        property: "og:description",
        content:
          "The terms that govern your use of xG Forge — a scientific football analytics platform. Read before relying on any number on the site.",
      },
      { property: "og:url", content: "https://xgforge.in/terms" },
      { name: "twitter:title", content: "Terms of Use — xG Forge" },
      { name: "twitter:description", content: "The terms that govern your use of xG Forge — a scientific football analytics platform. Read before relying on any number on the site." },
    ],
    links: [{ rel: "canonical", href: "https://xgforge.in/terms" }],
  }),
  component: TermsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function TermsPage() {
  const updated = "January 2025";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <header>
          <div className="text-[10px] uppercase tracking-[0.22em] text-primary mb-2">
            Legal
          </div>
          <h1 className="font-display text-5xl tracking-[0.01em] leading-none">
            Terms of Use
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Last updated · {updated}
          </p>
        </header>

        <Section title="1. Acceptance">
          <p>
            By accessing or using xG Forge (the &ldquo;Service&rdquo;), you agree to be bound by these
            Terms of Use. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. The service">
          <p>
            xG Forge is a football analytics platform. We surface statistical estimates &mdash;
            expected goals (xG), opponent-adjusted ratings, Monte Carlo simulations, and
            market-vs-model comparisons &mdash; for informational and educational purposes only.
          </p>
          <p>
            Nothing on the Service constitutes betting advice, financial advice, or a guarantee
            of any outcome. You are solely responsible for any decisions you make based on
            information you find here.
          </p>
        </Section>

        <Section title="3. Eligibility">
          <p>
            The Service is intended for users who are of legal age in their jurisdiction and who
            can lawfully enter into a binding agreement. Where the Service surfaces betting
            market data, additional local-law restrictions may apply to your use.
          </p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Scrape, mirror, or resell the Service or its underlying data.</li>
            <li>Reverse-engineer, decompile, or attempt to extract the source code.</li>
            <li>Use the Service to violate any law or any third party&apos;s rights.</li>
            <li>Interfere with, disrupt, or place an unreasonable load on the Service.</li>
          </ul>
        </Section>

        <Section title="5. Data accuracy disclaimer">
          <p>
            Every number on the Service is a statistical estimate. Models are wrong by
            construction &mdash; they reduce a complex world to a finite set of inputs. Live
            data may also be delayed, missing, or revised after publication by the underlying
            data providers.
          </p>
          <p>
            xG, win probabilities, projected lineups, and simulator outputs are provided
            &ldquo;as is&rdquo; and without warranty of any kind, express or implied. Do not
            stake money on the assumption that any number here is correct.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            The Service, its design, copy, models, derived metrics, and the arrangement of
            third-party data are the intellectual property of xG Forge and its licensors. Team
            names, league names, and other marks belong to their respective owners and appear
            here for identification only.
          </p>
        </Section>

        <Section title="7. Third-party data">
          <p>
            The Service combines data from multiple third-party providers. We do not control
            those providers and we make no representation about the accuracy, completeness, or
            timeliness of the data they supply. Outages, errors, or changes by any provider
            may affect what you see on the Service.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            To the maximum extent permitted by law, xG Forge and its operators are not liable for
            any indirect, incidental, consequential, special, or punitive damages, or for any
            loss of profits, revenue, data, or goodwill arising from your use of the Service
            &mdash; including, without limitation, any losses incurred from betting, trading,
            or other decisions made in reliance on the Service.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            We may suspend or terminate your access to the Service at any time, with or
            without notice, for any reason, including breach of these Terms. Sections intended
            to survive termination (intellectual property, disclaimers, limitation of
            liability) will continue to apply.
          </p>
        </Section>

        <Section title="10. Changes to these terms">
          <p>
            We may update these Terms from time to time. Material changes will be reflected by
            updating the &ldquo;Last updated&rdquo; date above. Your continued use of the
            Service after a change constitutes acceptance of the revised Terms.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about these Terms? Reach us at{" "}
            <a
              href="mailto:hello@xgforge.in"
              className="text-primary hover:underline"
            >
              hello@xgforge.in
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
