import styles from './FilterChip.module.scss';

export type FilterChipTone = 'neutral' | 'film' | 'digital';
export type FilterChipState = 'available' | 'unavailable';

export interface FilterChipProps {
  /** Visible chip text (e.g. a tag, person, camera, or "Film"). */
  label: string;
  /** Optional contextual result count rendered as a muted badge. */
  count?: number;
  /** Whether this facet is currently selected. Drives aria-pressed + the active style. */
  active?: boolean;
  /** Visual tone. 'film'/'digital' are neutral tri-state tints. */
  tone?: FilterChipTone;
  /** 'unavailable' greys out and disables the chip (3-state availability model). */
  state?: FilterChipState;
  /** Called when the chip is activated (click). Not called while unavailable. */
  onToggle: () => void;
}

/**
 * Canonical filter chip — a real <button> with aria-pressed; 'unavailable' state renders it disabled.
 */
export function FilterChip({
  label,
  count,
  active = false,
  tone = 'neutral',
  state = 'available',
  onToggle,
}: FilterChipProps) {
  const unavailable = state === 'unavailable';
  const classes = [
    styles.chip,
    active ? styles.active : null,
    tone !== 'neutral' ? styles[tone] : null,
    unavailable ? styles.unavailable : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-pressed={active}
      disabled={unavailable}
      onClick={onToggle}
    >
      {label}
      {count !== undefined && (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
