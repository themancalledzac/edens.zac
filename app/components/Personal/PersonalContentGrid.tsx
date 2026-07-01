'use client';

import { type ReactElement, useMemo } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { SavesProvider } from '@/app/components/Personal/SavesContext';
import { type MeResponse } from '@/app/types/Auth';
import { type AnyContentModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

interface PersonalContentGridProps {
  /** Content blocks to render: image/gif tiles (Images, Saved) or collection cards (Collections). */
  content: AnyContentModel[];
  /**
   * Wraps the grid in `MeProvider` + `SavesProvider` so each tile's `SaveHeart` renders and toggles.
   * Set for image/gif sections; omit for collection-card sections (no save affordance).
   */
  withSaves?: boolean;
  me?: MeResponse | null;
  /** The viewer's global saved image ids, seeding `SavesProvider` (only used when `withSaves`). */
  initialSavedImageIds?: number[];
}

/**
 * Flat grid of the viewer's content blocks rendered through the same layout pipeline the Location /
 * Taxonomy pages use (`processContentBlocks` -> `ContentBlockWithFullScreen`). Used for the tagged
 * Images, Saved bookmarks, and associated Collections sections of `/user`.
 */
export function PersonalContentGrid({
  content,
  withSaves = false,
  me = null,
  initialSavedImageIds = [],
}: PersonalContentGridProps) {
  const contentBlocks = useMemo(() => processContentBlocks(content, true), [content]);

  const grid: ReactElement = (
    <ContentBlockWithFullScreen
      content={contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView
      initialPageSize={30}
      chunkSize={4}
    />
  );

  if (!withSaves) return grid;

  return (
    <MeProvider me={me}>
      <SavesProvider initialSavedIds={initialSavedImageIds}>{grid}</SavesProvider>
    </MeProvider>
  );
}
