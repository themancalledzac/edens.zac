import Link from 'next/link';

import styles from './SegmentedChip.module.scss';

export interface Segment {
  key: string;
  label: string;
  count?: number;
  href: string;
  current: boolean;
}

export interface SegmentedChipProps {
  segments: readonly Segment[];
  /** Names the group for assistive tech, e.g. "Sections". */
  ariaLabel: string;
}

/**
 * One chip-shaped control holding N mutually-exclusive page sections. Segments are real links with
 * `aria-current` rather than tabs: each is a different URL with server-rendered content, so
 * middle-click, sharing and the back button all keep working.
 */
export function SegmentedChip({ segments, ariaLabel }: SegmentedChipProps) {
  return (
    <nav aria-label={ariaLabel} className={styles.group}>
      <ul className={styles.list}>
        {segments.map(segment => (
          <li key={segment.key} className={styles.item}>
            <Link
              href={segment.href}
              scroll={false}
              aria-current={segment.current ? 'page' : undefined}
              className={segment.current ? `${styles.segment} ${styles.current}` : styles.segment}
            >
              {segment.label}
              {segment.count !== undefined && (
                <span className={styles.count} aria-hidden="true">
                  {segment.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
