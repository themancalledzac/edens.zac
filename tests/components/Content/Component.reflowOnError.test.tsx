import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import Component from '@/app/components/Content/Component';
import { type AnyContentModel } from '@/app/types/Content';

const measured = { contentWidth: 1274, viewportHeight: 800, isMobile: false, width: 1280 };
jest.mock('@/app/hooks/useViewport', () => ({
  useViewport: () => measured,
}));

// Stub renderer: a click stands in for the real <Image onError>, firing onImageLoadError so we
// can drive the failure path without a real network/image load.
jest.mock('@/app/components/Content/CollectionContentRenderer', () => ({
  __esModule: true,
  default: ({
    contentId,
    onImageLoadError,
  }: {
    contentId: number;
    onImageLoadError?: (id: number) => void;
  }) => (
    <button
      type="button"
      data-testid={`item-${contentId}`}
      onClick={() => onImageLoadError?.(contentId)}
    />
  ),
}));

function makeImage(id: number): AnyContentModel {
  return {
    contentType: 'IMAGE',
    id,
    title: `image-${id}`,
    orderIndex: id,
    visible: true,
    imageUrl: `https://example.test/${id}.jpg`,
    imageWidth: 1200,
    imageHeight: 800,
    width: 1200,
    height: 800,
    locations: [],
  } as unknown as AnyContentModel;
}

describe('Component — reflow on runtime image-load failure', () => {
  it('drops a failed image from the public layout so the row reflows (no reserved void)', () => {
    const content = [makeImage(1), makeImage(2), makeImage(3), makeImage(4)];

    // Public view: no currentCollectionId.
    render(<Component content={content} />);

    expect(screen.getByTestId('item-2')).toBeInTheDocument();

    // Simulate image 2 failing to load.
    fireEvent.click(screen.getByTestId('item-2'));

    // The failed image is removed entirely; the surviving images remain.
    expect(screen.queryByTestId('item-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
    expect(screen.getByTestId('item-4')).toBeInTheDocument();
  });

  it('keeps a failed image in the manage layout (currentCollectionId set) for admin deletion', () => {
    const content = [makeImage(1), makeImage(2), makeImage(3), makeImage(4)];

    // Manage view: currentCollectionId is present, so the broken image must NOT be reflowed away.
    render(<Component content={content} currentCollectionId={42} />);

    fireEvent.click(screen.getByTestId('item-2'));

    expect(screen.getByTestId('item-2')).toBeInTheDocument();
  });
});
