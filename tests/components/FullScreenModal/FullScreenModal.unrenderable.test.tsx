/**
 * The `fullscreen-open` body class must track what the viewer actually paints.
 *
 * globals.css paints both `html:has(body.fullscreen-open)` and `body.fullscreen-open` solid #000 so
 * no page canvas shows through the 90%-opaque overlay on iOS. That is only safe while the overlay
 * is on screen: a state whose index resolves to no image renders null, and the class over a null
 * render is a black page with no viewer and no close button on it.
 */
import { render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

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
    title: `Image ${id}`,
    locations: [],
  }) as ContentImageModel;

const noop = () => {};

function renderModal(
  fullScreenState: { images: ContentImageModel[]; currentIndex: number } | null
) {
  return render(
    <FullScreenModal
      fullScreenState={fullScreenState}
      loadedImageIds={new Set<number>()}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={false}
      hideImage={noop}
      toggleImmersive={noop}
      isSwiping={{ current: false }}
      showMetadata={false}
      toggleMetadata={noop}
      navigateToNext={noop}
      navigateToPrevious={noop}
    />
  );
}

describe('FullScreenModal — states that render nothing', () => {
  afterEach(() => {
    document.body.classList.remove('fullscreen-open');
  });

  it('does not blacken the page when the state carries no images', () => {
    renderModal({ images: [], currentIndex: 0 });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('fullscreen-open');
  });

  it('does not blacken the page when currentIndex points past the end', () => {
    renderModal({ images: [img(1)], currentIndex: 4 });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass('fullscreen-open');
  });

  it('still blackens the page while a real image is on screen', () => {
    renderModal({ images: [img(1)], currentIndex: 0 });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body).toHaveClass('fullscreen-open');
  });

  it('removes the class again when the viewer closes', () => {
    const { rerender } = renderModal({ images: [img(1)], currentIndex: 0 });
    expect(document.body).toHaveClass('fullscreen-open');

    rerender(
      <FullScreenModal
        fullScreenState={null}
        loadedImageIds={new Set<number>()}
        setLoadedImageIds={noop}
        modalRef={{ current: null }}
        zoomTargetRef={{ current: null }}
        isZoomed={false}
        hideImage={noop}
        toggleImmersive={noop}
        isSwiping={{ current: false }}
        showMetadata={false}
        toggleMetadata={noop}
        navigateToNext={noop}
        navigateToPrevious={noop}
      />
    );

    expect(document.body).not.toHaveClass('fullscreen-open');
  });
});
