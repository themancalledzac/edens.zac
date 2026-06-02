import { Breadcrumb } from '@/app/components/Breadcrumb/Breadcrumb';
import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';
import { PageShell } from '@/app/components/ui/PageShell/PageShell';
import { type CollectionModel } from '@/app/types/Collection';
import { type ContentImageModel } from '@/app/types/Content';

import LocationPageClient from './LocationPageClient';

interface LocationPageProps {
  locationName: string;
  collections: CollectionModel[];
  images: ContentImageModel[];
  coverImage: ContentImageModel | null;
}

export default function LocationPage({
  locationName,
  collections,
  images,
  coverImage,
}: LocationPageProps) {
  return (
    <PageShell>
      <CollectionHeader
        title={locationName}
        count={images.length}
        cover={coverImage?.imageUrl ? { src: coverImage.imageUrl } : undefined}
        breadcrumb={
          <Breadcrumb items={[{ label: 'Explore', href: '/explore' }, { label: locationName }]} />
        }
      />
      <LocationPageClient images={images} collections={collections} />
    </PageShell>
  );
}
