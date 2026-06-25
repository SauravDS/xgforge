import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Menu } from "lucide-react";
import * as React from "react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavTo = "/live" | "/upcoming" | "/recent" | "/series" | "/about";

const NAV: { to: NavTo; label: string }[] = [
  { to: "/live", label: "Live" },
  { to: "/upcoming", label: "Upcoming" },
  { to: "/recent", label: "Recent" },
  { to: "/series", label: "Series" },
  { to: "/about", label: "About" },
];

const MOBILE_INLINE: { to: NavTo; label: string }[] = [
  { to: "/series", label: "Series" },
  { to: "/about", label: "About" },
];

const MOBILE_SHEET: { to: NavTo; label: string }[] = [
  { to: "/live", label: "Live" },
  { to: "/upcoming", label: "Upcoming" },
  { to: "/recent", label: "Recent" },
];

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const year = new Date().getFullYear();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Wordmark />
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden sm:flex min-w-0 flex-1 items-center justify-end gap-1 text-sm"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)",
          }}
        >
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile inline nav + hamburger */}
        <div className="sm:hidden ml-auto flex items-center gap-1">
          {MOBILE_INLINE.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ))}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-surface-1 transition-colors ml-1"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[80vw] max-w-[20rem] p-0 bg-surface-1 border-l border-primary/30 overflow-hidden"
            >
              {/* Ambient glow */}
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
                aria-hidden="true"
              />
              {/* Pitch texture */}
              <div className="pointer-events-none absolute inset-0 pitch-lines opacity-50" aria-hidden="true" />

              <div className="relative z-10 flex h-full flex-col">
                <div className="px-6 pt-6 pb-5 border-b border-border/60">
                  <Wordmark />
                  <div className="mt-4 text-[10px] uppercase tracking-[0.22em] text-primary">
                    Navigate
                  </div>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 px-4 py-5">
                  {MOBILE_SHEET.map((n) => (
                    <SheetClose key={n.to} asChild>
                      <Link
                        to={n.to}
                        activeProps={{
                          className:
                            "group relative bg-surface-1 text-foreground border-primary/40 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-primary before:rounded-full",
                        }}
                        inactiveProps={{
                          className:
                            "group text-muted-foreground border-transparent hover:bg-surface-2 hover:text-foreground hover:border-border/60",
                        }}
                        className="relative flex items-center justify-between px-4 py-3.5 rounded-lg border transition-colors font-display text-base uppercase tracking-[0.18em] font-medium"
                      >
                        <span>{n.label}</span>
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="px-6 pb-6 pt-4 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    © {year} xG Forge
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }: { to: NavTo; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeProps={{ className: "text-foreground bg-surface-1" }}
      className="snap-start shrink-0 text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs uppercase tracking-[0.14em] font-medium whitespace-nowrap"
    >
      {children}
    </Link>
  );
}

function Wordmark() {
  return (
    <span className="flex items-baseline gap-1 font-display text-[1.25rem] sm:text-[1.45rem] leading-none tracking-[0.04em]">
      <span className="text-foreground">xG</span>
      <span className="text-primary">Forge</span>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary translate-y-[-2px]" />
    </span>
  );
}
