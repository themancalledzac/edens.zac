'use client';

import { useMemo } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type AnyContentModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

import styles from './SearchPage.module.scss';

interface SearchResultsProps {
  content: AnyContentModel[];
}

/**
 * Search Results Grid
 *
 * Renders filtered content in a dense grid layout using ContentBlockWithFullScreen.
 * Uses a higher chunkSize (8) for a denser grid suitable for browsing/searching.
 *
 * Separated from SearchPage to allow efficient re-rendering when filters change
 * without re-mounting the entire page.
 */
export default function SearchResults({ content }: SearchResultsProps) {
  const contentBlocks = useMemo(() => processContentBlocks(content, true), [content]);

  if (contentBlocks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No images match the current filters. Try adjusting your criteria.</p>
      </div>
    );
  }

  return (
    <ContentBlockWithFullScreen
      content={contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView
      initialPageSize={50}
      chunkSize={8}
    />
  );
}
