import { type ReactNode } from 'react';

import styles from './Chip.module.scss';

interface ChipRowProps {
  children: ReactNode;
  /** Names a radiogroup row, e.g. "Photo size". Leave out for a plain row of chips. */
  radioGroupLabel?: string;
  /** Draws the 1px rule under the row. Off when a parent draws one rule for several rows. */
  underline?: boolean;
  /** `reverse` fills the bottom line first and wraps upward. */
  wrap?: 'wrap' | 'reverse' | 'none';
  /** Layout class from the parent, e.g. flex sizing. Not for restyling the chips. */
  className?: string;
}

/**
 * A row of {@link Chip}s with thin dividers between them and, by default, a 1px underline. Wrapped
 * lines sit 8px apart so the 44px touch overlays never overlap a line above.
 */
export function ChipRow({
  children,
  radioGroupLabel,
  underline = true,
  wrap = 'wrap',
  className,
}: ChipRowProps) {
  const classes = [
    styles.row,
    underline ? styles.underline : null,
    wrap === 'reverse' ? styles.wrapReverse : null,
    wrap === 'none' ? styles.noWrap : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role={radioGroupLabel ? 'radiogroup' : undefined}
      aria-label={radioGroupLabel}
    >
      {children}
    </div>
  );
}
