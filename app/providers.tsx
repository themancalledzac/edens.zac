/**
 * App-wide Providers (App Router)
 *
 * Optimization: Avoid global client providers. Use server component here and
 * wrap only interactive islands with client providers locally.
 */
import type { ReactElement, ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Intentionally no client providers at the root to minimize client JS payload.
  // Interactive components should import and use EditLiteProvider locally.
  return children as ReactElement;
}
