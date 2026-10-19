import { type MouseEvent, type ReactElement, type ReactNode } from 'react';

import styles from './CornerToggle.module.scss';

export type CornerTogglePlacement = 'top' | 'bottom';

interface CornerToggleProps {
  pressed: boolean;
  onToggle: () => void;
  label: string;
  icon: ReactNode;
  placement?: CornerTogglePlacement;
}

/**
 * Shared edge-flush corner box for per-image toggles (save heart, follow). Renders a
 * `type="button"` with `aria-pressed` and `aria-label`, pinned top-right by default or bottom-right
 * with `placement="bottom"`. The click handler calls `preventDefault` and `stopPropagation` before
 * `onToggle`, so the toggle neither navigates an enclosing link nor opens the enclosing image
 * wrapper's fullscreen view.
 */
export function CornerToggle({
  pressed,
  onToggle,
  label,
  icon,
  placement = 'top',
}: CornerToggleProps): ReactElement {
  const classNames = [
    styles.cornerToggle,
    placement === 'bottom' ? styles.cornerToggleBottom : '',
    pressed ? styles.cornerToggleActive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      aria-pressed={pressed}
      aria-label={label}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      {icon}
    </button>
  );
}
