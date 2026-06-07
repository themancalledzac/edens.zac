/**
 * Characterization tests for FullScreenModal's date/location resolution, rendered through the
 * metadata overlay. These pin the image-vs-collection fallback behavior before the logic is
 * extracted into fullScreenModalUtils, proving the extraction is behavior-preserving.
 *
 * The metadata overlay only renders when the current image is loaded (its id is in
 * loadedImageIds) AND showMetadata is true.
 */
import { render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { CollectionModel } from '@/app/types/Collection';
import { CollectionType } from '@/app/types/Collection';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls
// window.scrollTo — not implemented in jsdom. We only assert on metadata markup, so stub the
// lock to keep the test focused and the console clean.
jest.mock('@/app/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: jest.fn() }));

const img = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example/${id}.jpg`,
    imageWidth: 1000,
    imageHeight: 800,
    orderIndex: id,
    visible: true,
    title: `Image ${id}`,
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const gif = (id: number, overrides: Partial<ContentGifModel> = {}): ContentGifModel =>
  ({
    id,
    contentType: 'GIF',
    gifUrl: `https://cdn.example/${id}.mp4`,
    width: 800,
    height: 600,
    orderIndex: id,
    visible: true,
    title: `Gif ${id}`,
    ...overrides,
  }) as ContentGifModel;

const collection = (overrides: Partial<CollectionModel> = {}): CollectionModel =>
  ({
    id: 1,
    type: CollectionType.PORTFOLIO,
    title: 'Trip',
    slug: 'trip',
    locations: [],
    ...overrides,
  }) as CollectionModel;

const noop = () => {};

function renderModal(image: ContentImageModel | ContentGifModel, collectionData?: CollectionModel) {
  return render(
    <FullScreenModal
      fullScreenState={{ images: [image], currentIndex: 0 }}
      loadedImageIds={new Set<number>([image.id])}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      hideImage={noop}
      isSwiping={{ current: false }}
      showMetadata
      toggleMetadata={noop}
      router={{ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() } as never}
      collectionData={collectionData}
      navigateToNext={noop}
      navigateToPrevious={noop}
    />
  );
}

describe('FullScreenModal — date resolution (characterization)', () => {
  it('uses the image captureDate when present', () => {
    renderModal(
      img(1, { captureDate: '2024-03-01' }),
      collection({ collectionDate: '2020-01-01' })
    );
    expect(screen.getByText('2024-03-01')).toBeInTheDocument();
  });

  it('falls back to the collection collectionDate when the image has no captureDate', () => {
    renderModal(img(1, { captureDate: null }), collection({ collectionDate: '2020-01-01' }));
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
  });

  it('GIF blocks ignore any image fields and fall back to the collection collectionDate', () => {
    renderModal(gif(1), collection({ collectionDate: '2019-06-15' }));
    expect(screen.getByText('2019-06-15')).toBeInTheDocument();
  });
});

describe('FullScreenModal — location resolution (characterization)', () => {
  it('uses the image locations when present', () => {
    renderModal(
      img(1, { locations: [{ id: 5, name: 'Banff', slug: 'banff' }] }),
      collection({ locations: [{ id: 9, name: 'Elsewhere', slug: 'elsewhere' }] })
    );
    expect(screen.getByText('Banff')).toBeInTheDocument();
    expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();
  });

  it('falls back to collection locations when the image has none', () => {
    renderModal(
      img(1, { locations: [] }),
      collection({ locations: [{ id: 9, name: 'Elsewhere', slug: 'elsewhere' }] })
    );
    expect(screen.getByText('Elsewhere')).toBeInTheDocument();
  });

  it('GIF blocks fall back to collection locations', () => {
    renderModal(
      gif(1),
      collection({ locations: [{ id: 9, name: 'Elsewhere', slug: 'elsewhere' }] })
    );
    expect(screen.getByText('Elsewhere')).toBeInTheDocument();
  });
});
