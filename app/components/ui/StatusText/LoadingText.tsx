import { type ReactNode } from 'react';

import styles from './StatusText.module.scss';

export interface LoadingTextProps {
  /** Whether the read is in flight. Drives the text only — the container renders either way. */
  isLoading: boolean;
  children: ReactNode;
  /** See {@link EmptyStateProps.align} — same two placements, same meaning. */
  align?: 'inline' | 'page';
  className?: string;
}

/**
 * Text shown while a read is in flight.
 *
 * Carries `role="status"` + `aria-live="polite"` so the wait is announced. That is the reason this
 * exists as a component rather than a convention: of the six hand-rolled loading messages this
 * replaces, only one announced itself, so screen-reader users got silence where sighted users got
 * "Loading…". `Button` already handles its own pending state via its `loading` prop — use that for
 * a control, and this for a region.
 *
 * The container is unconditional, which is why the flag is a prop instead of a `{isLoading && …}`
 * guard at the call site. A live region inserted into the DOM with its text already inside is the
 * known-unreliable case — several screen-reader/browser pairs only watch regions they saw before
 * the change, so the announcement is silently dropped. One region kept mounted for the surface's
 * lifetime, with only its *text* changing, is the shape that actually announces. Callers must
 * therefore render this beside the branch that swaps in the loaded content, never inside it.
 *
 * First paint is the one case this cannot fix: a surface that mounts already loading inserts the
 * region and its text in the same commit. Fixing that needs a client-side second pass, and this
 * primitive stays Server-Component-friendly (no hooks, no `'use client'`). Every later transition —
 * a retry, a refetch, each page of an infinite scroll — goes through the persistent region, and
 * those are the ones a user triggers and waits on.
 *
 * `polite` is deliberate: the text is static for as long as the read runs, so there is nothing to
 * re-announce, and a wait is never urgent enough for `assertive`.
 *
 * An empty container has to cost nothing. `.text:empty` drops the placement padding so the node
 * has no height, and a caller whose own `className` adds spacing must gate it the same way (see
 * `.gateLoading` in `ClientGalleryGate.module.scss`). Watch for flex/grid parents with `gap`: an
 * empty child still claims a gap slot, so a caller in that position either loses the gap or keeps
 * conditional mounting.
 */
export function LoadingText({
  isLoading,
  children,
  align = 'inline',
  className,
}: LoadingTextProps) {
  const classes = [styles.text, styles[align], className].filter(Boolean).join(' ');
  return (
    <p className={classes} role="status" aria-live="polite">
      {isLoading ? children : null}
    </p>
  );
}

export default LoadingText;
