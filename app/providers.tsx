/**
 * App Providers
 *
 * Minimalist provider wrapper that passes through children without adding
 * global client-side context. Optimized for server-first rendering by
 * avoiding root-level client providers that increase JavaScript payload.
 *
 * @dependencies
 * - React types for ReactNode and ReactElement
 *
 * @param children - React components to render without provider wrapping
 * @returns ReactElement passing through children unchanged
 */
import type { ReactElement, ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Intentionally no client providers at the root to minimize client JS payload.
  // Interactive components should import and use EditLiteProvider locally.
  return children as ReactElement;
}
