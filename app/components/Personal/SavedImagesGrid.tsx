'use client';

import { useMemo } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { SavesProvider } from '@/app/components/Personal/SavesContext';
import { type MeResponse } from '@/app/types/Auth';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

interface SavedImagesGridProps {
  images: ContentImageModel[];
  me: MeResponse | null;
  initialSavedImageIds: number[];
}

/**
 * Flat grid of the viewer's saved images, rendered through the same layout pipeline the Location /
 * Taxonomy pages use (`processContentBlocks` -> `ContentBlockWithFullScreen`). Wrapped in
 * `MeProvider` + `SavesProvider` so each tile's `SaveHeart` renders and the viewer can un-save.
 */
export function SavedImagesGrid({ images, me, initialSavedImageIds }: SavedImagesGridProps) {
  const contentBlocks = useMemo(() => processContentBlocks(images, true), [images]);

  return (
    <MeProvider me={me}>
      <SavesProvider initialSavedIds={initialSavedImageIds}>
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
        />
      </SavesProvider>
    </MeProvider>
  );
}
