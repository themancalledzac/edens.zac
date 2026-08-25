/**
 * Pins `EditModeLayer` as the provider of the grid's edit-only render-constant props.
 *
 * Before F6 these twelve went down as JSX props on `ContentBlockWithFullScreen`, so a dropped
 * line was a type error at the call site. Now they go through `RendererProvider`, where every
 * member is optional — deleting the provider entirely, or dropping one member out of the value,
 * type-checks fine and silently turns the feature off. That is the whole reason this file exists:
 * the full suite passed with the provider deleted before these tests were written.
 *
 * `useCollectionEdit` is mocked so the twelve have known, mutually distinguishable values and the
 * assertions read against the mapping rather than against edit state the layer computes. The grid
 * is replaced by a probe that reports the real `useRenderer()` value, so what is asserted is the
 * value a real `Component` would read.
 */
import '@testing-library/jest-dom';

import { act, render } from '@testing-library/react';

import { type RendererContextValue } from '@/app/components/Content/RendererContext';
import EditModeLayer from '@/app/components/ContentCollection/edit/EditModeLayer';
import { INITIAL_FILTER_STATE } from '@/app/types/GalleryFilter';
import { makeCollection, makeEdit } from '@/tests/fixtures/collectionEditFixtures';

const contextProbe = jest.fn();

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useRenderer } = jest.requireActual<{ useRenderer: () => unknown }>(
    '@/app/components/Content/RendererContext'
  );
  const MockGrid = (props: Record<string, unknown>) => {
    contextProbe({ context: useRenderer(), props });
    return <div data-testid="grid" />;
  };
  return { __esModule: true, default: MockGrid };
});

jest.mock('@/app/components/Metadata/MetadataModal', () => ({
  __esModule: true,
  default: () => <div data-testid="metadata-modal" />,
}));
jest.mock('@/app/components/TextBlockCreateModal/TextBlockCreateModal', () => ({
  __esModule: true,
  default: () => <div data-testid="text-block-modal" />,
}));

/**
 * The edit sheet mounts `CollectionRolesSection`, which fetches on mount. Resolving both calls
 * with empty lists keeps that async state update out of these assertions — nothing here reads
 * roles, and an unmocked fetch only produces act() noise.
 */
jest.mock('@/app/lib/api/roles', () => ({
  listCollectionRoles: jest.fn(() => Promise.resolve([])),
  listRoles: jest.fn(() => Promise.resolve([])),
  grantRoleAccess: jest.fn(() => Promise.resolve()),
  revokeRoleAccess: jest.fn(() => Promise.resolve()),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/smith-wedding',
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseCollectionEdit = jest.fn();
jest.mock('@/app/components/ContentCollection/edit/useCollectionEdit', () => ({
  useCollectionEdit: (...args: unknown[]) => mockUseCollectionEdit(...args),
}));

const onArrowMove = jest.fn();
const onPickUp = jest.fn();
const onPlace = jest.fn();
const onCancelImageMove = jest.fn();

const collection = makeCollection({ id: 42, slug: 'smith-wedding' });

/** Every one of the twelve set to a value distinguishable from its default. */
function editInReorderMode() {
  return makeEdit({
    isSelectingCoverImage: true,
    currentCoverImageId: 99,
    justClickedImageId: 11,
    reorder: {
      active: true,
      displayOrder: [3, 1, 2],
      moves: [{ imageId: 1, toIndex: 3 }],
      onArrowMove,
      onPickUp,
      onPlace,
      onCancelImageMove,
      pickedUpImageId: 7,
    },
  });
}

/**
 * Renders and flushes the microtask queue, so the edit sheet's on-mount fetches settle inside
 * act(). Without the flush every assertion still passes but React warns on each resolved promise.
 */
async function renderLayer() {
  await act(async () => {
    render(
      <EditModeLayer
        collection={collection}
        filterState={INITIAL_FILTER_STATE}
        setFilterState={jest.fn()}
        syncToUrl={jest.fn()}
        onMounted={jest.fn()}
      />
    );
  });
}

const context = (): RendererContextValue =>
  contextProbe.mock.calls.at(-1)?.[0].context as RendererContextValue;

const gridProps = (): Record<string, unknown> =>
  contextProbe.mock.calls.at(-1)?.[0].props as Record<string, unknown>;

describe('EditModeLayer provides the edit slice through RendererContext', () => {
  beforeEach(async () => {
    contextProbe.mockClear();
    mockUseCollectionEdit.mockReturnValue(editInReorderMode());
    await renderLayer();
  });

  it('renders the grid inside a provider at all', () => {
    expect(contextProbe).toHaveBeenCalled();
    expect(context()).not.toEqual({});
  });

  it.each([
    ['currentCollectionId', 42],
    ['isSelectingCoverImage', true],
    ['currentCoverImageId', 99],
    ['justClickedImageId', 11],
    ['isReorderMode', true],
    ['reorderMoves', [{ imageId: 1, toIndex: 3 }]],
    ['pickedUpImageId', 7],
    ['reorderDisplayOrder', [3, 1, 2]],
  ])('provides %s', (key, expected) => {
    expect(context()[key as keyof RendererContextValue]).toEqual(expected);
  });

  it.each([
    ['onArrowMove', onArrowMove],
    ['onPickUp', onPickUp],
    ['onPlace', onPlace],
    ['onCancelImageMove', onCancelImageMove],
  ])('provides the %s handler by identity', (key, handler) => {
    expect(context()[key as keyof RendererContextValue]).toBe(handler);
  });

  /**
   * The four members public callers also set stay props. If they ever move into the value as
   * well, they would arrive two ways with precedence invisible at both ends — the exact defect
   * F6 was told not to create.
   */
  it.each(['enableFullScreenView', 'onImageClick', 'selectedIds'])(
    'passes %s as a prop, not through the context',
    key => {
      expect(gridProps()).toHaveProperty(key);
      expect(context()).not.toHaveProperty(key);
    }
  );
});

describe('EditModeLayer gates the reorder members on reorder mode', () => {
  beforeEach(async () => {
    contextProbe.mockClear();
    mockUseCollectionEdit.mockReturnValue(makeEdit({ isSelectingCoverImage: true }));
    await renderLayer();
  });

  /**
   * Out of reorder mode every reorder member is undefined, so the renderer cannot show a
   * pick-up target or an arrow control. The handlers are withheld too — passing them while
   * `isReorderMode` is false would leave the overlay wired to live callbacks.
   */
  it.each([
    'reorderMoves',
    'pickedUpImageId',
    'reorderDisplayOrder',
    'onArrowMove',
    'onPickUp',
    'onPlace',
    'onCancelImageMove',
  ])('withholds %s when reorder is inactive', key => {
    expect(context()[key as keyof RendererContextValue]).toBeUndefined();
  });

  it('still provides the cover-selection members, which are independent of reorder mode', () => {
    expect(context().isReorderMode).toBe(false);
    expect(context().isSelectingCoverImage).toBe(true);
    expect(context().currentCollectionId).toBe(42);
  });
});
