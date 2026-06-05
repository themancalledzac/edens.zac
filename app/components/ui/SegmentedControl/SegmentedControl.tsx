'use client';

import { type KeyboardEvent, type ReactNode, useRef } from 'react';

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
 * mutually-exclusive set of options. Implements the WAI-ARIA radio-group pattern: a single tab stop
 * (roving `tabindex`) with Arrow / Home / End keys moving selection between segments, plus
 * `radiogroup`/`radio` + `aria-checked` semantics. The selected segment is a high-contrast light
 * pill so the control reads correctly on both light surfaces and the dark admin panel.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  showDescription = false,
}: SegmentedControlProps<T>) {
  const selected = options.find(option => option.value === value);
  const selectedIndex = options.findIndex(option => option.value === value);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Select the option at `index` and move DOM focus to it (keeps the roving tab stop in sync).
  const focusAndSelect = (index: number) => {
    const next = options[index];
    if (!next) return;
    onChange(next.value);
    buttonsRef.current[index]?.focus();
  };

  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusAndSelect(index === last ? 0 : index + 1); // wrap to first
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusAndSelect(index === 0 ? last : index - 1); // wrap to last
        break;
      case 'Home':
        e.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        e.preventDefault();
        focusAndSelect(last);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <div role="radiogroup" aria-label={ariaLabel} className={styles.group}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          // Roving tabindex: only the selected segment is in the tab order (or the first segment
          // when `value` matches none); the arrow keys move within the group.
          const tabbable = isSelected || (selectedIndex === -1 && index === 0);
          return (
            <button
              key={option.value}
              ref={el => {
                buttonsRef.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabbable ? 0 : -1}
              className={`${styles.segment} ${isSelected ? styles.selected : ''}`}
              onClick={() => onChange(option.value)}
              onKeyDown={handleKeyDown(index)}
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
