/**
 * Pointer handling on the FullScreenModal overlay.
 *
 * Where a click lands decides the action, mirroring the touch tap split in useFullScreenImage:
 * the framed photo toggles immersive mode, the black letterbox around it dismisses the viewer.
 * Previously the whole overlay dismissed, so a plain desktop click on the photo closed the viewer —
 * the `isSwiping` / `isZoomed` guards are touch-gesture state and never fire for a mouse.
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls window.scrollTo —
// not implemented in jsdom. We only assert on click routing, so stub the lock.
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
  overrides: {
    isSwiping?: { current: boolean };
    isZoomed?: boolean;
    hideImage?: () => void;
    toggleImmersive?: () => void;
  } = {}
) {
  const hideImage = overrides.hideImage ?? jest.fn();
  const toggleImmersive = overrides.toggleImmersive ?? jest.fn();

  render(
    <FullScreenModal
      fullScreenState={{ images: [img(1), img(2), img(3)], currentIndex: 1 }}
      loadedImageIds={new Set<number>([2])}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={overrides.isZoomed ?? false}
      hideImage={hideImage}
      toggleImmersive={toggleImmersive}
      isSwiping={overrides.isSwiping ?? { current: false }}
      showMetadata={false}
      toggleMetadata={noop}
      navigateToNext={noop}
      navigateToPrevious={noop}
    />
  );

  const overlay = screen.getByRole('dialog').querySelector('.overlayContainer');
  if (!overlay) throw new Error('overlay container not rendered');

  return { hideImage, toggleImmersive, overlay, photo: screen.getByAltText('Image 2') };
}

describe('FullScreenModal — overlay clicks', () => {
  it('toggles immersive instead of closing when the photo itself is clicked', () => {
    const { hideImage, toggleImmersive, photo } = renderModal();

    fireEvent.click(photo);

    expect(toggleImmersive).toHaveBeenCalledTimes(1);
    expect(hideImage).not.toHaveBeenCalled();
  });

  it('closes when the letterbox around the photo is clicked', () => {
    const { hideImage, toggleImmersive, overlay } = renderModal();

    fireEvent.click(overlay);

    expect(hideImage).toHaveBeenCalledTimes(1);
    expect(toggleImmersive).not.toHaveBeenCalled();
  });

  it('does nothing on the click that ends a swipe/pinch/pan', () => {
    const { hideImage, toggleImmersive, overlay, photo } = renderModal({
      isSwiping: { current: true },
    });

    fireEvent.click(photo);
    fireEvent.click(overlay);

    expect(hideImage).not.toHaveBeenCalled();
    expect(toggleImmersive).not.toHaveBeenCalled();
  });

  it('does nothing while the photo is zoomed', () => {
    const { hideImage, toggleImmersive, overlay, photo } = renderModal({ isZoomed: true });

    fireEvent.click(photo);
    fireEvent.click(overlay);

    expect(hideImage).not.toHaveBeenCalled();
    expect(toggleImmersive).not.toHaveBeenCalled();
  });

  it('still closes on a letterbox click when no immersive toggle is wired up', () => {
    const hideImage = jest.fn();
    render(
      <FullScreenModal
        fullScreenState={{ images: [img(1)], currentIndex: 0 }}
        loadedImageIds={new Set<number>([1])}
        setLoadedImageIds={noop}
        modalRef={{ current: null }}
        zoomTargetRef={{ current: null }}
        isZoomed={false}
        hideImage={hideImage}
        isSwiping={{ current: false }}
        showMetadata={false}
        toggleMetadata={noop}
        navigateToNext={noop}
        navigateToPrevious={noop}
      />
    );

    const overlay = screen.getByRole('dialog').querySelector('.overlayContainer');
    fireEvent.click(overlay!);
    expect(hideImage).toHaveBeenCalledTimes(1);

    // The photo click is swallowed rather than dismissing the viewer.
    fireEvent.click(screen.getByAltText('Image 1'));
    expect(hideImage).toHaveBeenCalledTimes(1);
  });
});
