/**
 * Immersive-mode rendering for FullScreenModal.
 *
 * Immersive mode (touch-toggled in useFullScreenImage) hides ALL chrome — nav arrows, the position
 * counter, the close button, and the metadata overlay — leaving only the photo. These tests pin
 * that the `immersive` prop gates every control while the image itself stays mounted.
 */
import { render, screen } from '@testing-library/react';

import { FullScreenModal } from '@/app/components/FullScreenModal/FullScreenModal';
import type { ContentImageModel } from '@/app/types/Content';

// The Modal primitive locks body scroll via useBodyScrollLock, whose cleanup calls window.scrollTo —
// not implemented in jsdom. We only assert on markup, so stub the lock to keep the test focused.
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

const baseProps = {
  // currentIndex 1 of 3 → both prev and next arrows are eligible to render.
  fullScreenState: { images: [img(1), img(2), img(3)], currentIndex: 1 },
  loadedImageIds: new Set<number>([2]),
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

describe('FullScreenModal — immersive mode', () => {
  it('renders all chrome when not immersive', () => {
    render(<FullScreenModal {...baseProps} immersive={false} />);

    expect(screen.getByLabelText('Close fullscreen image')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous image')).toBeInTheDocument();
    expect(screen.getByLabelText('Next image')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Show metadata')).toBeInTheDocument();
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it('hides every control in immersive mode but keeps the image', () => {
    render(<FullScreenModal {...baseProps} immersive />);

    expect(screen.queryByLabelText('Close fullscreen image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Previous image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Next image')).not.toBeInTheDocument();
    expect(screen.queryByText('2 / 3')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Show metadata')).not.toBeInTheDocument();

    // The photo itself stays mounted — immersive hides chrome, not content.
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it('defaults to showing chrome when the immersive prop is omitted', () => {
    render(<FullScreenModal {...baseProps} />);
    expect(screen.getByLabelText('Close fullscreen image')).toBeInTheDocument();
  });
});
