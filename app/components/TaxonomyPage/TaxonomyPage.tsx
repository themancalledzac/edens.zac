import { Breadcrumb } from '@/app/components/Breadcrumb/Breadcrumb';
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

  return (
    <PageShell>
      <CollectionHeader
        title={entityName}
        count={images.length}
        breadcrumb={
          <Breadcrumb items={[{ label: 'Explore', href: '/explore' }, { label: entityName }]} />
        }
      />
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
