/**
 * Pins the render-constant props all the way down the grid chain:
 * `ContentBlockWithFullScreen` → `Component` → `BoxRenderer` → `CollectionContentRenderer`.
 *
 * Before F2 each hop re-listed the set in JSX, and nothing asserted that a member actually
 * arrived — a dropped line would have shipped silently. Now the middle two hops carry the set as
 * an object (`{...shared}` into `Component`, then `RendererProvider` down to the leaves), which
 * makes a silent drop cheaper to introduce, not dearer: a mistyped rest destructure loses the whole
 * block at once. So the leaf's props are asserted member by member, against values chosen to be
 * distinguishable from every default.
 *
 * `CollectionContentRenderer` is the only mock in the chain — everything between the entry point
 * and the leaf is the real component.
 */
import '@testing-library/jest-dom';

import { act, render } from '@testing-library/react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type CollectionModel } from '@/app/types/Collection';
import { type CollectionContentRendererProps } from '@/app/types/ContentRenderer';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

jest.mock('@/app/hooks/useViewport', () => ({
  useViewport: () => ({ contentWidth: 1274, viewportHeight: 800, isMobile: false, width: 1280 }),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

const leafProbe = jest.fn();
jest.mock('@/app/components/Content/CollectionContentRenderer', () => ({
  __esModule: true,
  default: (props: CollectionContentRendererProps) => {
    leafProbe(props);
    return <div data-testid={`leaf-${props.contentId}`} />;
  },
}));

const onImageClick = jest.fn();
const onArrowMove = jest.fn();
const onPickUp = jest.fn();
const onPlace = jest.fn();
const onCancelImageMove = jest.fn();
const onImageLoadError = jest.fn();

const collectionData = { id: 7, slug: 'threading-collection' } as CollectionModel;

const renderGrid = () =>
  render(
    <ContentBlockWithFullScreen
      content={[createImageContent(1)]}
      collectionData={collectionData}
      collectionSlug={collectionData.slug}
      enableFullScreenView
      onImageClick={onImageClick}
      selectedIds={[11, 22]}
      currentCollectionId={7}
      isSelectingCoverImage
      currentCoverImageId={99}
      justClickedImageId={11}
      isReorderMode
      reorderMoves={[{ imageId: 1, toIndex: 3 }]}
      pickedUpImageId={1}
      reorderDisplayOrder={[1]}
      onArrowMove={onArrowMove}
      onPickUp={onPickUp}
      onPlace={onPlace}
      onCancelImageMove={onCancelImageMove}
      onImageLoadError={onImageLoadError}
    />
  );

const leafProps = (): CollectionContentRendererProps =>
  leafProbe.mock.calls.at(-1)?.[0] as CollectionContentRendererProps;

describe('render-constant props reach the leaf renderer', () => {
  beforeEach(() => {
    leafProbe.mockClear();
    renderGrid();
  });

  it('renders the leaf at all', () => {
    expect(leafProbe).toHaveBeenCalled();
    expect(leafProps().contentId).toBe(1);
  });

  it.each([
    ['enableFullScreenView', true],
    ['selectedIds', [11, 22]],
    ['currentCollectionId', 7],
    ['isSelectingCoverImage', true],
    ['currentCoverImageId', 99],
    ['justClickedImageId', 11],
    ['isReorderMode', true],
    ['pickedUpImageId', 1],
    ['collectionSlug', 'threading-collection'],
  ])('threads %s', (key, expected) => {
    expect(leafProps()[key as keyof CollectionContentRendererProps]).toEqual(expected);
  });

  it.each(['onImageClick', 'onArrowMove', 'onPickUp', 'onPlace', 'onCancelImageMove'])(
    'threads the %s handler by identity',
    key => {
      const handlers: Record<string, jest.Mock> = {
        onImageClick,
        onArrowMove,
        onPickUp,
        onPlace,
        onCancelImageMove,
      };
      expect(leafProps()[key as keyof CollectionContentRendererProps]).toBe(handlers[key]);
    }
  );

  /**
   * `onImageLoadError` is the one handler that must NOT arrive by identity: `Component` wraps it so
   * a failed image is recorded and the public view can reflow around it, then calls the caller's.
   */
  it('threads a wrapper around onImageLoadError, not the raw handler', () => {
    expect(typeof leafProps().onImageLoadError).toBe('function');
    expect(leafProps().onImageLoadError).not.toBe(onImageLoadError);
    const wrapped = leafProps().onImageLoadError;
    act(() => wrapped?.(1));
    expect(onImageLoadError).toHaveBeenCalledWith(1);
  });

  /**
   * The reorder move list and display order stop at `BoxRenderer`, which turns them into the
   * per-leaf flags. Pinning the derived flags rather than the raw arrays is what keeps a future
   * refactor from "helpfully" forwarding the arrays as well.
   */
  it('derives the per-leaf reorder flags rather than forwarding the raw lists', () => {
    expect(leafProps().isPickedUp).toBe(true);
    expect(leafProps().hasMoved).toBe(true);
    expect(leafProps()).not.toHaveProperty('reorderMoves');
    expect(leafProps()).not.toHaveProperty('reorderDisplayOrder');
  });
});
