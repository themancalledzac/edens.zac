import { ChevronDown } from 'lucide-react';

import styles from './SectionTitleCard.module.scss';

interface SectionTitleCardProps {
  /** Section label, e.g. "Collections". */
  label: string;
  /** Number of items in the section, shown after the label. */
  count: number;
  /** Whether the section body is expanded (drives the chevron + `aria-expanded`). */
  open: boolean;
  /** Toggles the parent-owned open state. */
  onToggle: () => void;
  /** `aria-controls` target: the id of the body element this card toggles. */
  controlsId: string;
}

/**
 * Presentational "title card" atom for a `/user` section: a full-width, TEXT-content-block-styled
 * header that reads as "first on a new row". Renders as a `<button>` (label + item count + chevron)
 * with `aria-expanded` reflecting the parent-owned open state.
 */
export function SectionTitleCard({
  label,
  count,
  open,
  onToggle,
  controlsId,
}: SectionTitleCardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      aria-expanded={open}
      aria-controls={controlsId}
      onClick={onToggle}
    >
      <span className={styles.label}>
        {label}
        <span className={styles.count}>{count}</span>
      </span>
      <ChevronDown
        className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
