/**
 * Pins the render-constant props all the way down the grid chain:
 * `ContentBlockWithFullScreen` → `Component` → `BoxRenderer` → `CollectionContentRenderer`.
 *
 * The middle hops carry the set as an object — `{...shared}` into `Component`, then
 * `RendererProvider` down to the leaves — so a mistyped rest destructure loses the whole block at
 * once and silently. Every member is therefore asserted at the leaf, against values chosen to be
 * distinguishable from its default.
 *
 * The set arrives by two routes and this test pins the join. The members public callers pass go in
 * as props; the twelve only `EditModeLayer` sets go in through a `RendererProvider` above the grid.
 * `Component` reads the ambient value and re-provides it merged with its own props and derived
 * values, so a leaf receiving all of them is the only proof the merge dropped neither side.
 *
 * `CollectionContentRenderer` is the only mock in the chain — everything between the entry point
 * and the leaf is the real component.
 */
import '@testing-library/jest-dom';

import { render } from '@testing-library/react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import {
  type RendererContextValue,
  RendererProvider,
} from '@/app/components/Content/RendererContext';
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

const collectionData = { id: 7, slug: 'threading-collection' } as CollectionModel;

/** The twelve `EditModeLayer` supplies through the context. */
const editValue: RendererContextValue = {
  currentCollectionId: 7,
  isSelectingCoverImage: true,
  currentCoverImageId: 99,
  justClickedImageId: 11,
  isReorderMode: true,
  reorderMoves: [{ imageId: 1, toIndex: 3 }],
  pickedUpImageId: 1,
  reorderDisplayOrder: [1],
  onArrowMove,
  onPickUp,
  onPlace,
  onCancelImageMove,
};

const renderGrid = () =>
  render(
    <RendererProvider value={editValue}>
      <ContentBlockWithFullScreen
        content={[createImageContent(1)]}
        collectionData={collectionData}
        collectionSlug={collectionData.slug}
        enableFullScreenView
        onImageClick={onImageClick}
        selectedIds={[11, 22]}
      />
    </RendererProvider>
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
   * `onImageLoadError` is the one handler the leaf receives that no caller supplies. `Component`
   * builds it itself, to record a failed id so the public view can drop the image and reflow.
   * What the handler DOES is covered by `Component.reflowOnError.test.tsx`.
   */
  it('supplies onImageLoadError from Component, with no caller passing one', () => {
    expect(typeof leafProps().onImageLoadError).toBe('function');
    for (const handler of [onImageClick, onArrowMove, onPickUp, onPlace, onCancelImageMove]) {
      expect(leafProps().onImageLoadError).not.toBe(handler);
    }
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
