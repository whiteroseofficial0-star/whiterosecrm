import { type ReactNode } from "react";

/**
 * Wraps children and suppresses hydration warnings caused by the Dark Reader
 * browser extension injecting `data-darkreader-inline-stroke` attributes into
 * SVG elements after server render but before React hydrates.
 */
export function SuppressSvgHydration({ children }: { children: ReactNode }) {
  return <div suppressHydrationWarning>{children}</div>;
}
