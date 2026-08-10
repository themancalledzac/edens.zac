'use client';

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import styles from './RatingStars.module.scss';

const STAR_VALUES = [1, 2, 3, 4, 5];

const ARROW_DELTA: Record<string, number> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/**
 * Resolves the star a navigation key moves to, given the star that currently holds focus.
 * Star values are 1-based and contiguous, so the first is 1 and the last is `STAR_VALUES.length`.
 * Arrows wrap at both ends (WAI-ARIA radiogroup pattern); anything else returns null so the
 * key falls through to the browser.
 */
function nextStarFor(key: string, from: number): number | null {
  if (key === 'Home') return 1;
  if (key === 'End') return STAR_VALUES.length;
  const delta = ARROW_DELTA[key];
  if (delta === undefined) return null;
  return ((from - 1 + delta + STAR_VALUES.length) % STAR_VALUES.length) + 1;
}

interface RatingStarsProps {
  initialRating: number | null;
  onChange: (rating: number | null) => Promise<void> | void;
  ariaLabel?: string;
}

/**
 * Five-star rating control, exposed as a WAI-ARIA radiogroup.
 *
 * Keyboard model (roving tabindex): the group is a single tab stop — the checked star, or the
 * first one when nothing is checked, is the only child with `tabIndex={0}`. Left/Up and
 * Right/Down step between stars and wrap at the ends, Home/End jump to the first/last, and
 * because this is a standard radiogroup, selection follows focus: moving commits the new
 * rating. Focus is moved programmatically so the arrow keys, not Tab, do the walking.
 *
 * Clicking (or Space/Enter, which the browser turns into a click) keeps its toggle semantics:
 * activating the star that is already selected clears the rating back to unrated. Arrow/Home/End
 * never clear — a rating of 1 stays 1 when Home is pressed on it, and no write is issued.
 *
 * While a write is in flight the stars report `aria-disabled` but stay focusable, and both
 * handlers no-op. A real `disabled` attribute would be the obvious choice, but browsers drop
 * focus from a control the moment it becomes disabled: the star the user just activated with
 * Space/Enter — or arrowed onto — would hand focus back to the document, so the next Space press
 * scrolls the page and the next Tab restarts from the top. Staying focusable means focus is never
 * lost, so nothing has to be restored afterwards. Arrow keys are still `preventDefault`ed while
 * pending, which makes them inert rather than letting ArrowDown fall through to the scroller.
 */
export default function RatingStars({ initialRating, onChange, ariaLabel }: RatingStarsProps) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [pending, setPending] = useState(false);
  const [tabStop, setTabStop] = useState(initialRating ?? 1);
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // `initialRating` often arrives after mount (admin metadata fetch), so the mount-time seed
  // would otherwise show empty stars for an already-rated collection all session.
  useEffect(() => {
    setRating(initialRating);
    setTabStop(initialRating ?? 1);
  }, [initialRating]);

  const commit = async (next: number | null) => {
    setPending(true);
    try {
      await onChange(next);
      setRating(next);
    } catch {
      // Swallowed deliberately: `onChange` surfaces the failure to the user before
      // rethrowing, and the click handler discards this promise. Stars keep the old value.
    } finally {
      setPending(false);
    }
  };

  const handleClick = (n: number) => {
    if (pending) return;
    setTabStop(n);
    void commit(rating === n ? null : n);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const next = nextStarFor(event.key, from);
    if (next === null) return;
    event.preventDefault();
    if (pending) return;
    setTabStop(next);
    starRefs.current[next - 1]?.focus();
    if (next === rating) return;
    void commit(next);
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel ?? 'Rating'} className={styles.stars}>
      {STAR_VALUES.map(n => (
        <button
          key={n}
          ref={element => {
            starRefs.current[n - 1] = element;
          }}
          type="button"
          role="radio"
          aria-checked={rating === n}
          tabIndex={tabStop === n ? 0 : -1}
          aria-disabled={pending || undefined}
          className={`${styles.star} ${rating != null && n <= rating ? styles.filled : ''}`}
          onClick={() => handleClick(n)}
          onKeyDown={event => handleKeyDown(event, n)}
        >
          <span aria-hidden="true">{rating != null && n <= rating ? '*' : '.'}</span>
          <span className={styles.srOnly}>{n === 1 ? '1 star' : `${n} stars`}</span>
        </button>
      ))}
    </div>
  );
}
