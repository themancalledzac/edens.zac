import { type ReactNode } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';

import styles from './FilteredEmptyState.module.scss';

interface FilteredEmptyStateProps {
  children: ReactNode;
  onClear: () => void;
}

/**
 * The filtered-to-zero empty state shared by the search and location pages: the message with a
 * "Clear filters" button under it. The caller owns what clearing means, so the reset goes through
 * the page's own filter-change path and the URL sync stays the existing one.
 */
export function FilteredEmptyState({ children, onClear }: FilteredEmptyStateProps) {
  return (
    <div className={styles.wrapper}>
      <EmptyState align="page">{children}</EmptyState>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
