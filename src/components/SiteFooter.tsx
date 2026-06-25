import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";

type FootTo = "/terms" | "/privacy";

const INTERNAL_LINKS: { to: FootTo; label: string }[] = [
  { to: "/terms", label: "Terms of Use" },
  { to: "/privacy", label: "Privacy Policy" },
];

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border/60 mt-12">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="flex items-baseline gap-1 shrink-0">
          <span className="font-display text-lg tracking-[0.04em] inline-flex items-baseline gap-1">
            <span className="text-foreground">xG</span>
            <span className="text-primary">Forge</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary translate-y-[-2px]" />
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] uppercase tracking-[0.18em]">
          {INTERNAL_LINKS.map((l, i) => (
            <span key={l.to} className="flex items-center gap-x-3">
              <Link to={l.to} className="text-muted-foreground hover:text-foreground">
                {l.label}
              </Link>
              {i < INTERNAL_LINKS.length - 1 && (
                <span className="hidden sm:inline text-border">·</span>
              )}
            </span>
          ))}
          <span className="hidden sm:inline text-border">·</span>
          <a
            href="mailto:contacts@xgforge.in"
            className="text-muted-foreground hover:text-foreground"
          >
            Contact
          </a>
        </nav>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1">
            <a
              href="https://instagram.com/xglabs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="xG Forge on Instagram"
              className="p-2 -m-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/xglabs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="xG Forge on X"
              className="p-2 -m-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="h-3.5 w-3.5" />
            </a>
            <a
              href="mailto:contacts@xgforge.in"
              aria-label="Contact xG Forge"
              className="p-2 -m-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            © {year} xG Forge
          </span>
        </div>
      </div>
    </footer>
  );
}
