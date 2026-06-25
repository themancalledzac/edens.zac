'use client';

import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useState,
} from 'react';

import styles from './RatingSlider.module.scss';

interface RatingSliderProps {
  contentId: number;
  /** The current resolved rating (0-5) to seed the control. */
  value: number;
  /** Fired on every drag step (caller throttles + re-flows the layout). */
  onDrag: (contentId: number, value: number) => void;
  /** Fired on release (caller persists with optimistic + rollback). */
  onCommit: (contentId: number, value: number) => void;
}

/**
 * Mobile-first 0-5 rating slider rendered as an overlay in the image corner. Snaps to integers
 * (`step={1}`), is touch-friendly, and stops click propagation so dragging never opens the
 * fullscreen viewer. Drag fires `onDrag` (live re-flow); release (pointer up or key up) fires
 * `onCommit` (persist). Local state tracks the in-flight value so the thumb tracks the finger even
 * before the parent state round-trips.
 */
export function RatingSlider({ contentId, value, onDrag, onCommit }: RatingSliderProps) {
  const [local, setLocal] = useState(value);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const next = Number.parseInt(e.target.value, 10);
      setLocal(next);
      onDrag(contentId, next);
    },
    [contentId, onDrag]
  );

  const commit = useCallback(() => {
    onCommit(contentId, local);
  }, [contentId, local, onCommit]);

  const stop = useCallback((e: ReactPointerEvent<HTMLInputElement>) => {
    // Keep a drag/tap on the slider from bubbling to the image wrapper (opens fullscreen).
    e.stopPropagation();
  }, []);

  return (
    <div className={styles.sliderOverlay} onClick={e => e.stopPropagation()}>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={5}
        step={1}
        value={local}
        aria-label={`Rating: ${local} of 5`}
        onChange={handleChange}
        onPointerDown={stop}
        onPointerUp={e => {
          stop(e);
          commit();
        }}
        onKeyUp={commit}
      />
      <span className={styles.value} aria-hidden="true">
        {local}
      </span>
    </div>
  );
}
