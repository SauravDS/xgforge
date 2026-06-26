// Runtime error bridge — forwards React error boundary captures to any
// registered exception handler (e.g. a Sentry-compatible integration).

type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ErrorEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReportOptions,
  ) => void;
};

declare global {
  interface Window {
    __errorEvents?: ErrorEvents;
    // Legacy alias kept for the Lovable sandbox bridge — do not remove.
    __lovableEvents?: ErrorEvents;
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const handler = window.__errorEvents ?? window.__lovableEvents;
  handler?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
