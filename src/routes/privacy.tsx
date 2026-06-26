import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — xG Forge" },
      {
        name: "description",
        content:
          "How xG Forge collects, uses, and protects information when you use the football analytics platform.",
      },
      { property: "og:title", content: "Privacy Policy — xG Forge" },
      {
        property: "og:description",
        content:
          "How xG Forge collects, uses, and protects information when you use the football analytics platform.",
      },
      { property: "og:url", content: "https://xgforge.in/privacy" },
      { name: "twitter:title", content: "Privacy Policy — xG Forge" },
      { name: "twitter:description", content: "How xG Forge collects, uses, and protects information when you use the football analytics platform." },
    ],
    links: [{ rel: "canonical", href: "https://xgforge.in/privacy" }],
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Last updated · {updated}
          </p>
        </header>

        <Section title="1. What we collect">
          <p>
            xG Forge is read-only for most visitors and does not require you to create an
            account. We collect the minimum needed to run the site:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="text-foreground">Request logs</span> &mdash; IP address, user
              agent, referrer, and the route requested. Used for security and debugging.
            </li>
            <li>
              <span className="text-foreground">Aggregate analytics</span> &mdash; anonymised
              pageviews and performance metrics. No personally identifying profile is built.
            </li>
            <li>
              <span className="text-foreground">Local preferences</span> &mdash; settings you
              choose (filters, league selection) stored in your browser&apos;s local storage on
              your device.
            </li>
          </ul>
          <p>We do not collect special-category personal data. We do not sell your data.</p>
        </Section>

        <Section title="2. How we use it">
          <p>To operate the Service, fix bugs, prevent abuse, and improve the product. That&apos;s it.</p>
        </Section>

        <Section title="3. Cookies and local storage">
          <p>
            We use a small number of strictly-necessary cookies and browser local storage
            entries to remember your preferences and maintain the session. We do not use
            third-party advertising cookies.
          </p>
        </Section>

        <Section title="4. Third-party services">
          <p>
            The Service relies on third-party providers for football data, hosting, error
            reporting, and analytics. Those providers process limited request metadata under
            their own privacy policies. We choose providers that minimise data collection.
          </p>
        </Section>

        <Section title="5. Data retention">
          <p>
            Request logs are retained for a short rolling window (typically 30 days) for
            security and debugging, then deleted. Aggregate analytics are retained in
            de-identified form.
          </p>
        </Section>

        <Section title="6. Your rights">
          <p>
            Depending on where you live, you may have the right to request access to,
            correction of, or deletion of personal data we hold about you, and to object to
            certain processing. To exercise these rights, contact us at the address below.
          </p>
        </Section>

        <Section title="7. Children's privacy">
          <p>
            The Service is not directed to children under 13 (or the equivalent age in your
            jurisdiction). We do not knowingly collect data from children.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this policy occasionally. Material changes will be reflected by
            updating the &ldquo;Last updated&rdquo; date above.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Privacy questions? Email{" "}
            <a
              href="mailto:privacy@xgforge.in"
              className="text-primary hover:underline"
            >
              privacy@xgforge.in
            </a>
            .
          </p>
        </Section>
      </main>
    </div>
  );
}
