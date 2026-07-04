import { type ReactElement } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type AnyContentModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

interface PersonalContentGridProps {
  /** Content blocks to render: image/gif tiles (Images, Saved) or collection cards (Collections). */
  content: AnyContentModel[];
}

/**
 * Flat grid of the viewer's content blocks rendered through the same layout pipeline the Location /
 * Taxonomy pages use (`processContentBlocks` -> `ContentBlockWithFullScreen`). Used for the tagged
 * Images, Saved bookmarks, and associated Collections sections of `/user`.
 *
 * A Server Component: the SaveHeart affordance is wired by a single `MeProvider` + `SavesProvider`
 * hoisted by the `/user` page around all sections, so this grid does not own that context itself.
 */
export function PersonalContentGrid({ content }: PersonalContentGridProps): ReactElement {
  const contentBlocks = processContentBlocks(content, true);

  return (
    <ContentBlockWithFullScreen
      content={contentBlocks}
      priorityBlockIndex={0}
      enableFullScreenView
      initialPageSize={30}
      chunkSize={4}
    />
  );
}
