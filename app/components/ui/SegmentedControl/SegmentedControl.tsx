'use client';

import { type ReactNode } from 'react';

import styles from './SegmentedControl.module.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Optional helper text shown beneath the control when `showDescription` is set. */
  description?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the radiogroup (required — the control has no visible legend of its own). */
  ariaLabel: string;
  /** When true, render the selected option's `description` beneath the segments. */
  showDescription?: boolean;
}

/**
 * Single-select segmented control — a compact alternative to a stacked radio group for a small,
 * mutually-exclusive set of options. Exposes proper `radiogroup`/`radio` + `aria-checked`
 * semantics (the RatingStars pattern). The selected segment is a high-contrast light pill so the
 * control reads correctly on both light surfaces and the dark admin panel.
 *
 * Server-Component-friendly: no hooks.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  showDescription = false,
}: SegmentedControlProps<T>) {
  const selected = options.find(option => option.value === value);

  return (
    <div>
      <div role="radiogroup" aria-label={ariaLabel} className={styles.group}>
        {options.map(option => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.segment} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {showDescription && selected?.description && (
        <p className={styles.description}>{selected.description}</p>
      )}
    </div>
  );
}
