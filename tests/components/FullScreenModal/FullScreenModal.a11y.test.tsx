/**
 * Accessibility contract for FullScreenModal.
 *
 * Two things used to fail silently here:
 *  - the dialog pointed `aria-labelledby` at an id that only existed inside the collapsed metadata
 *    panel, so an open viewer usually had NO accessible name. The name now lives in a
 *    visually-hidden <h2> that always renders.
 *  - the viewer built its alt text from title/caption and ignored `alt`, the one field authored for
 *    screen readers. It now resolves alt exactly like the grid does, through `humanLabel`, which
 *    walks the same alt → title → caption chain and additionally discards filename-shaped values —
 *    the backend seeds `title` from the upload, so most photos have nothing else.
 */
import { render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls window.scrollTo —
// not implemented in jsdom. We only assert on ARIA and alt markup, so stub the lock.
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
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const noop = () => {};

function renderModal(image: ContentImageModel, showMetadata = false) {
  return render(
    <FullScreenModal
      fullScreenState={{ images: [image], currentIndex: 0 }}
      loadedImageIds={new Set<number>([image.id])}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={false}
      hideImage={noop}
      isSwiping={{ current: false }}
      showMetadata={showMetadata}
      toggleMetadata={noop}
      router={{ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() } as never}
      navigateToNext={noop}
      navigateToPrevious={noop}
    />
  );
}

describe('FullScreenModal — dialog accessible name', () => {
  it('names the dialog from the image title while the metadata panel is collapsed', () => {
    renderModal(img(1, { title: 'Sunset Ridge' }));

    expect(screen.getByRole('dialog', { name: 'Fullscreen image: Sunset Ridge' })).toBeVisible();
  });

  it('falls back to a generic name for an untitled image', () => {
    renderModal(img(1, { title: undefined }));

    expect(screen.getByRole('dialog', { name: 'Fullscreen image' })).toBeVisible();
  });

  it('keeps a single #fullscreen-title in the tree when the metadata panel is open', () => {
    renderModal(img(1, { title: 'Sunset Ridge' }), true);

    expect(document.querySelectorAll('#fullscreen-title')).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Fullscreen image: Sunset Ridge' })).toBeVisible();
    // The visible title still renders inside the panel, separate from the dialog's name.
    expect(screen.getByText('Sunset Ridge')).toBeInTheDocument();
  });

  // The backend seeds `title` from the uploaded file, so naming the dialog straight off it
  // announced "Fullscreen image: DSC underscore 4364 dot webp".
  it('falls back to the generic name rather than announcing a filename title', () => {
    renderModal(img(1, { title: 'DSC_4364.webp' }));

    expect(screen.getByRole('dialog', { name: 'Fullscreen image' })).toBeVisible();
  });
});

describe('FullScreenModal — image alt text', () => {
  it('prefers the authored alt over title and caption', () => {
    renderModal(
      img(1, { alt: 'Low sun over a granite ridge', title: 'Sunset Ridge', caption: 'Day three' })
    );

    expect(screen.getByAltText('Low sun over a granite ridge')).toBeInTheDocument();
  });

  it('falls back to the title when no alt was authored', () => {
    renderModal(img(1, { alt: undefined, title: 'Sunset Ridge', caption: 'Day three' }));

    expect(screen.getByAltText('Sunset Ridge')).toBeInTheDocument();
  });

  it('falls back to the caption when neither alt nor title exist', () => {
    renderModal(img(1, { alt: undefined, title: undefined, caption: 'Day three' }));

    expect(screen.getByAltText('Day three')).toBeInTheDocument();
  });

  it('falls back to a generic description when the image carries no text at all', () => {
    renderModal(img(1, { alt: undefined, title: undefined, caption: undefined }));

    expect(screen.getByAltText('Full screen image')).toBeInTheDocument();
  });

  it('skips a filename title and uses the authored caption instead', () => {
    renderModal(img(1, { alt: undefined, title: 'DSC_4364.webp', caption: 'Day three' }));

    expect(screen.getByAltText('Day three')).toBeInTheDocument();
  });

  it('falls back to the generic description when the only text is a filename', () => {
    renderModal(img(1, { alt: undefined, title: 'DSC_4364.webp', caption: undefined }));

    expect(screen.getByAltText('Full screen image')).toBeInTheDocument();
  });
});

describe('FullScreenModal — metadata location links', () => {
  it('styles location links so they do not fall back to the default browser link colour', () => {
    renderModal(
      img(1, { title: 'Sunset Ridge', locations: [{ id: 5, name: 'Banff', slug: 'banff' }] }),
      true
    );

    expect(screen.getByRole('link', { name: 'Banff' })).toHaveClass('metadataLink');
  });
});
