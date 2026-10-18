import { unstable_rethrow } from 'next/navigation';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { meServer } from '@/app/lib/api/auth';
import { type MeResponse } from '@/app/types/Auth';
import { type ContentImageModel } from '@/app/types/Content';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { logger } from '@/app/utils/logger';
import { type SsrViewport } from '@/app/utils/ssrViewport';

interface TaxonomyPageProps {
  entityName: string;
  images: ContentImageModel[];
  ssrViewport?: SsrViewport;
}

/**
 * Photo grid for a resolved taxonomy entity such as a tag. The route 404s an unknown entity, so
 * `entityName` is always real. An entity with no photos renders an empty state rather than an
 * empty grid. `ssrViewport` reserves per-item dimensions on the server render. The principal is
 * resolved with `meServer` and handed to the shell; a failed read other than a Next control-flow
 * throw degrades to an anonymous shell.
 */
export default async function TaxonomyPage({ entityName, images, ssrViewport }: TaxonomyPageProps) {
  let me: MeResponse | null;
  try {
    me = await meServer();
  } catch (error) {
    unstable_rethrow(error);
    logger.warn('TaxonomyPage', 'Failed to resolve the principal', { error });
    me = null;
  }

  const contentBlocks = processContentBlocks(images, true);

  return (
    <PageShell me={me}>
      <CollectionHeader title={entityName} count={images.length} />
      {contentBlocks.length > 0 ? (
        <ContentBlockWithFullScreen
          content={contentBlocks}
          priorityBlockIndex={0}
          enableFullScreenView
          initialPageSize={30}
          chunkSize={4}
          ssrViewport={ssrViewport}
        />
      ) : (
        <EmptyState align="page">No photos have this tag yet.</EmptyState>
      )}
    </PageShell>
  );
}
