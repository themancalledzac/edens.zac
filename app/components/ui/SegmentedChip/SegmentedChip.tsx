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
  /**
   * Intercepts a plain left click so the caller can switch sections in place instead of letting the
   * link navigate. A modifier click or a non-primary button still navigates normally.
   */
  onSelect?: (key: string, href: string) => void;
}

/**
 * One chip-shaped control holding N mutually-exclusive page sections. Segments are real links with
 * `aria-current` rather than tabs: each is a different URL with server-rendered content, so
 * middle-click, sharing and the back button all keep working.
 */
export function SegmentedChip({ segments, ariaLabel, onSelect }: SegmentedChipProps) {
  return (
    <nav aria-label={ariaLabel} className={styles.group}>
      <ul className={styles.list}>
        {segments.map(segment => (
          <li key={segment.key} className={styles.item}>
            <Link
              href={segment.href}
              scroll={false}
              aria-current={segment.current ? 'page' : undefined}
              className={[styles.segment, segment.current ? styles.current : null]
                .filter(Boolean)
                .join(' ')}
              onClick={
                onSelect
                  ? event => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
                        return;
                      }
                      event.preventDefault();
                      onSelect(segment.key, segment.href);
                    }
                  : undefined
              }
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
