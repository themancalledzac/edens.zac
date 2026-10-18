import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { type SsrViewport } from '@/app/utils/ssrViewport';

interface TaxonomyPageProps {
  entityName: string;
  images: ContentImageModel[];
  ssrViewport?: SsrViewport;
}

/**
 * Photo grid for a resolved taxonomy entity such as a tag. The route 404s an unknown entity, so
 * `entityName` is always real. An entity with no photos renders an empty state rather than an
 * empty grid. `ssrViewport` reserves per-item dimensions on the server render.
 */
export default function TaxonomyPage({ entityName, images, ssrViewport }: TaxonomyPageProps) {
  const contentBlocks = processContentBlocks(images, true);

  return (
    <PageShell>
      <CollectionHeader title={entityName} count={images.length} />
      {contentBlocks.length > 0 ? (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
          serverContentWidth={ssrViewport?.contentWidth}
          serverViewportHeight={ssrViewport?.viewportHeight}
          serverIsMobile={ssrViewport?.isMobile}
        />
      ) : (
        <EmptyState align="page">No photos have this tag yet.</EmptyState>
      )}
    </PageShell>
  );
}
