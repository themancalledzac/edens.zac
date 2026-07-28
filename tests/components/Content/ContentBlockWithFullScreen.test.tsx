/**
 * The fullscreen viewer's prev/next list must contain photographs and GIFs only. A converted
 * child-collection card carries contentType: 'IMAGE' (convertCollectionContentToParallax), so a
 * plain contentType check admits it — the viewer then shows a collection cover as a photo with no
 * EXIF and no route out. The `?image=<id>` deep-link restore reads the same list.
 */
import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import type { AnyContentModel, ContentImageModel } from '@/app/types/Content';

const mockShowImage = jest.fn();

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

jest.mock('@/app/hooks/useFullScreenImage', () => ({
  useFullScreenImage: () => ({
    fullScreenState: null,
    loadedImageIds: new Set<number>(),
    showMetadata: false,
    modalRef: { current: null },
    zoomTargetRef: { current: null },
    isZoomed: false,
    immersive: false,
    isSwiping: false,
    showImage: mockShowImage,
    hideImage: jest.fn(),
    toggleMetadata: jest.fn(),
    setLoadedImageIds: jest.fn(),
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    isOpen: false,
    navigateToNext: jest.fn(),
    navigateToPrevious: jest.fn(),
  }),
}));

let capturedOnFullScreenImageClick: ((image: ContentImageModel) => void) | undefined;

jest.mock('@/app/components/Content/Component', () => ({
  __esModule: true,
  default: (props: { onFullScreenImageClick?: (image: ContentImageModel) => void }) => {
    capturedOnFullScreenImageClick = props.onFullScreenImageClick;
    return <div data-testid="grid" />;
  },
}));

const photo: ContentImageModel = {
  id: 1,
  contentType: 'IMAGE',
  orderIndex: 0,
  imageUrl: 'https://cdn.example/photo-1.jpg',
  locations: [],
};

const collectionCard = {
  id: 2,
  contentType: 'IMAGE',
  orderIndex: 1,
  enableParallax: true,
  imageUrl: 'https://cdn.example/cover-2.jpg',
  slug: 'child-gallery',
  locations: [],
} as unknown as ContentImageModel;

const gif: AnyContentModel = {
  id: 3,
  contentType: 'GIF',
  orderIndex: 2,
  gifUrl: 'https://cdn.example/clip-3.mp4',
};

const blocks: AnyContentModel[] = [photo, collectionCard, gif];

beforeEach(() => {
  mockShowImage.mockClear();
  capturedOnFullScreenImageClick = undefined;
  window.history.replaceState({}, '', '/');
});

describe('ContentBlockWithFullScreen — viewable list excludes collection cards', () => {
  it('gives the viewer only the photo and the GIF when a photo is clicked', () => {
    render(<ContentBlockWithFullScreen content={blocks} enableFullScreenView />);
    expect(capturedOnFullScreenImageClick).toBeDefined();

    capturedOnFullScreenImageClick!(photo);

    expect(mockShowImage).toHaveBeenCalledTimes(1);
    const [opened, list] = mockShowImage.mock.calls[0] as [ContentImageModel, AnyContentModel[]];
    expect(opened.id).toBe(1);
    expect(list.map(block => block.id)).toEqual([1, 3]);
  });

  it('does not open the viewer for a ?image= deep link pointing at a collection card', () => {
    window.history.replaceState({}, '', '/?image=2');
    render(<ContentBlockWithFullScreen content={blocks} enableFullScreenView />);
    expect(mockShowImage).not.toHaveBeenCalled();
  });

  it('still opens the viewer for a ?image= deep link pointing at a real photo', () => {
    window.history.replaceState({}, '', '/?image=3');
    render(<ContentBlockWithFullScreen content={blocks} enableFullScreenView />);

    expect(mockShowImage).toHaveBeenCalledTimes(1);
    const [opened, list] = mockShowImage.mock.calls[0] as [ContentImageModel, AnyContentModel[]];
    expect(opened.id).toBe(3);
    expect(list.map(block => block.id)).toEqual([1, 3]);
  });
});
