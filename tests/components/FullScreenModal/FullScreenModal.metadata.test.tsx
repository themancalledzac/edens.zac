/**
 * Characterization tests for FullScreenModal's date/location resolution, rendered through the
 * metadata overlay. These pin the image-vs-collection fallback behavior before the logic is
 * extracted into fullScreenModalUtils, proving the extraction is behavior-preserving.
 *
 * The metadata overlay only renders when the current image is loaded (its id is in
 * loadedImageIds) AND showMetadata is true.
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { CollectionModel } from '@/app/types/Collection';
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
    title: 'Trip',
    slug: 'trip',
    locations: [],
    ...overrides,
  }) as CollectionModel;

const noop = () => {};

function renderModal(
  image: ContentImageModel | ContentGifModel,
  collectionData?: CollectionModel,
  toggleImmersive: () => void = noop
) {
  return render(
    <FullScreenModal
      fullScreenState={{ images: [image], currentIndex: 0 }}
      loadedImageIds={new Set<number>([image.id])}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={false}
      hideImage={noop}
      toggleImmersive={toggleImmersive}
      isSwiping={{ current: false }}
      showMetadata
      toggleMetadata={noop}
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
    expect(screen.getByText('March 1st, 2024')).toBeInTheDocument();
  });

  it('falls back to the collection collectionDate when the image has no captureDate', () => {
    renderModal(img(1, { captureDate: null }), collection({ collectionDate: '2020-01-01' }));
    expect(screen.getByText('January 1st, 2020')).toBeInTheDocument();
  });

  it('GIF blocks ignore any image fields and fall back to the collection collectionDate', () => {
    renderModal(gif(1), collection({ collectionDate: '2019-06-15' }));
    expect(screen.getByText('June 15th, 2019')).toBeInTheDocument();
  });

  it('drops the time component from a captureDate carrying one', () => {
    renderModal(img(1, { captureDate: '2023-10-13T02:32:00' }), collection({}));
    expect(screen.getByText('October 13th, 2023')).toBeInTheDocument();
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

/**
 * F5 turned the hand-rolled `<a href>` + `router.push` into a `next/link` `Link`. These pin the two
 * things that change: the anchor must still carry a real href (so middle-click and open-in-new-tab
 * work, which the old preventDefault broke), and the click must still stop propagating.
 *
 * The link carried its own `stopPropagation`, which F5 also dropped: `.metadataOverlay` already
 * stops every click inside it (`FullScreenModal.tsx:236`), so the link's copy was dead. The
 * overlay-level guard is the load-bearing one and is pinned below.
 */
describe('FullScreenModal — location link', () => {
  const withLocation = () => img(1, { locations: [{ id: 5, name: 'Banff', slug: 'banff' }] });

  it('renders the location as a real link to its slug page', () => {
    renderModal(withLocation(), collection({}));
    expect(screen.getByRole('link', { name: 'Banff' })).toHaveAttribute('href', '/location/banff');
  });

  it('keeps clicks inside the metadata overlay away from the viewer click handler', () => {
    const toggleImmersive = jest.fn();
    renderModal(withLocation(), collection({}), toggleImmersive);

    fireEvent.click(screen.getByRole('link', { name: 'Banff' }));

    expect(toggleImmersive).not.toHaveBeenCalled();
  });

  it('renders a location without a slug as plain text, not a link', () => {
    renderModal(img(1, { locations: [{ id: 6, name: 'Nowhere' }] }), collection({}));
    expect(screen.getByText('Nowhere')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Nowhere' })).not.toBeInTheDocument();
  });
});
