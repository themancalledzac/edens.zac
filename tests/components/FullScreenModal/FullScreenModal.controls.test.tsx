/**
 * Overlay controls and metadata affordances for FullScreenModal.
 *
 * Pins the contract that survived the move from hand-rolled <button>s onto the shared
 * IconButton/CloseButton primitives:
 *  - close / prev / next / metadata-toggle are still <button type="button"> with the same
 *    accessible names, and still invoke the same callbacks.
 *  - the toggle's `aria-controls` resolves to a mounted element while the panel is open, and is
 *    absent while it is collapsed (a dangling idref is invalid ARIA).
 *  - related-collection chips are real anchors carrying an href, so they are focusable and support
 *    cmd/middle-click; chips without a slug stay plain text.
 */
import { fireEvent, render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ChildCollection } from '@/app/types/Collection';
import type { ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls window.scrollTo —
// not implemented in jsdom. These tests only assert on markup and handlers, so stub the lock.
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

const noop = () => {};

function renderModal(
  overrides: {
    images?: ContentImageModel[];
    currentIndex?: number;
    showMetadata?: boolean;
    hideImage?: () => void;
    toggleMetadata?: () => void;
    navigateToNext?: () => void;
    navigateToPrevious?: () => void;
  } = {}
) {
  const hideImage = overrides.hideImage ?? jest.fn();
  const toggleMetadata = overrides.toggleMetadata ?? jest.fn();
  const navigateToNext = overrides.navigateToNext ?? jest.fn();
  const navigateToPrevious = overrides.navigateToPrevious ?? jest.fn();
  const images = overrides.images ?? [img(1), img(2), img(3)];

  render(
    <FullScreenModal
      fullScreenState={{ images, currentIndex: overrides.currentIndex ?? 1 }}
      loadedImageIds={new Set<number>(images.map(i => i.id))}
      setLoadedImageIds={noop}
      modalRef={{ current: null }}
      zoomTargetRef={{ current: null }}
      isZoomed={false}
      hideImage={hideImage}
      isSwiping={{ current: false }}
      showMetadata={overrides.showMetadata ?? false}
      toggleMetadata={toggleMetadata}
      router={{ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() } as never}
      navigateToNext={navigateToNext}
      navigateToPrevious={navigateToPrevious}
    />
  );

  return { hideImage, toggleMetadata, navigateToNext, navigateToPrevious };
}

describe('FullScreenModal — overlay control buttons', () => {
  it.each([['Close fullscreen image'], ['Previous image'], ['Next image'], ['Show metadata']])(
    'exposes "%s" as a non-submitting button with an accessible name',
    name => {
      renderModal();

      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('type', 'button');
    }
  );

  it('closes the viewer when the close control is activated', () => {
    const { hideImage } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close fullscreen image' }));

    expect(hideImage).toHaveBeenCalledTimes(1);
  });

  it('steps backwards when the previous control is activated', () => {
    const { navigateToPrevious, navigateToNext } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }));

    expect(navigateToPrevious).toHaveBeenCalledTimes(1);
    expect(navigateToNext).not.toHaveBeenCalled();
  });

  it('steps forwards when the next control is activated', () => {
    const { navigateToNext, navigateToPrevious } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }));

    expect(navigateToNext).toHaveBeenCalledTimes(1);
    expect(navigateToPrevious).not.toHaveBeenCalled();
  });

  it('flips the metadata panel when the toggle is activated', () => {
    const { toggleMetadata } = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Show metadata' }));

    expect(toggleMetadata).toHaveBeenCalledTimes(1);
  });

  it('does not render nav controls at the ends of the set', () => {
    renderModal({ currentIndex: 0, images: [img(1), img(2)] });

    expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();
  });
});

describe('FullScreenModal — metadata toggle aria-controls', () => {
  it('points at the mounted metadata panel while it is open', () => {
    renderModal({ showMetadata: true });

    const toggle = screen.getByRole('button', { name: 'Hide metadata' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const controlled = toggle.getAttribute('aria-controls');
    expect(controlled).toBeTruthy();
    expect(document.getElementById(controlled as string)).toBeInTheDocument();
  });

  it('omits aria-controls while the panel is unmounted, rather than dangling', () => {
    renderModal({ showMetadata: false });

    const toggle = screen.getByRole('button', { name: 'Show metadata' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
  });
});

describe('FullScreenModal — related collection chips', () => {
  const collections: ChildCollection[] = [
    { collectionId: 7, name: 'Iceland', slug: 'iceland' },
    { collectionId: 8, name: 'Unlinked' },
  ];

  it('renders a slugged collection as an anchor carrying its href', () => {
    renderModal({ images: [img(1, { collections })], currentIndex: 0, showMetadata: true });

    const link = screen.getByRole('link', { name: 'Iceland' });
    expect(link).toHaveAttribute('href', '/iceland');
    expect(link).toHaveClass('metadataSectionItemClickable');
  });

  it('leaves a collection without a slug as plain, non-interactive text', () => {
    renderModal({ images: [img(1, { collections })], currentIndex: 0, showMetadata: true });

    expect(screen.getByText('Unlinked')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Unlinked' })).not.toBeInTheDocument();
  });

  it('falls back to the collection id when no name was returned', () => {
    renderModal({
      images: [img(1, { collections: [{ collectionId: 12, slug: 'twelve' }] })],
      currentIndex: 0,
      showMetadata: true,
    });

    expect(screen.getByRole('link', { name: 'Collection 12' })).toHaveAttribute('href', '/twelve');
  });
});
