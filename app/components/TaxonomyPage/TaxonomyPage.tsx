import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';

interface TaxonomyPageProps {
  entityName: string;
  images: ContentImageModel[];
}

export default function TaxonomyPage({ entityName, images }: TaxonomyPageProps) {
  const contentBlocks = processContentBlocks(images, true);
  // Guard against an unresolved/empty entity name so the page still has a real,
  // orienting <h1> instead of an empty heading.
  const title = entityName?.trim() || 'Untitled';

  return (
    <PageShell>
      <CollectionHeader title={title} count={images.length} />
      {contentBlocks.length > 0 && (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
        />
      )}
    </PageShell>
  );
}
