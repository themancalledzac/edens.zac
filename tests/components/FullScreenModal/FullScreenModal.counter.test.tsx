/**
 * Position-counter rendering for FullScreenModal.
 *
 * The viewer shows a 1-based "N / total" indicator over the current image. It is
 * only meaningful for multi-image sets, so a single-image viewer omits it.
 *
 * NOTE: FullScreenState is { images, currentIndex } only — no scrollPosition. The
 * fixtures here deliberately do not pass one (it was a removed footgun).
 */
import { render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls
// window.scrollTo — not implemented in jsdom. We only assert on the counter markup,
// so stub the lock to keep the test focused and the console clean.
jest.mock('@/app/hooks/useBodyScrollLock', () => ({ useBodyScrollLock: jest.fn() }));

const img = (id: number): ContentImageModel =>
  ({
    id,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example/${id}.jpg`,
    imageWidth: 1000,
    imageHeight: 800,
    orderIndex: id,
    visible: true,
  }) as ContentImageModel;

const noop = () => {};

const baseProps = {
  loadedImageIds: new Set<number>(),
  setLoadedImageIds: noop,
  modalRef: { current: null },
  zoomTargetRef: { current: null },
  isZoomed: false,
  hideImage: noop,
  isSwiping: { current: false },
  showMetadata: false,
  toggleMetadata: noop,
  router: { push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() } as never,
  navigateToNext: noop,
  navigateToPrevious: noop,
};

describe('FullScreenModal — position counter', () => {
  it('shows "2 / 3" for the middle image of a multi-image set', () => {
    render(
      <FullScreenModal
        {...baseProps}
        fullScreenState={{ images: [img(1), img(2), img(3)], currentIndex: 1 }}
      />
    );
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('shows "1 / 3" for the first image', () => {
    render(
      <FullScreenModal
        {...baseProps}
        fullScreenState={{ images: [img(1), img(2), img(3)], currentIndex: 0 }}
      />
    );
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('omits the counter for a single-image viewer', () => {
    render(
      <FullScreenModal {...baseProps} fullScreenState={{ images: [img(1)], currentIndex: 0 }} />
    );
    expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
  });
});
