/**
 * Regression test: selecting one lens must not grey out every other lens chip.
 *
 * A lens is single-valued per image (a photo was shot through exactly one lens), and lenses are
 * AND-combined (`lensMatchMode: 'AND'` in `buildCollectionCriteria`), so two selected lenses match
 * nothing at all. The Lens dimension is therefore single-choice in the toolbar
 * (`EXCLUSIVE_FILTER_KEYS`): clicking a second lens SWITCHES to it.
 *
 * That switch is only reachable if the other lens chips stay enabled. Deriving the bar's
 * `filteredAvailable.lenses` from `filteredImages` -- the images surviving the CURRENT criteria,
 * which already include the active lens -- collapses every surviving image onto the chosen lens,
 * so `extractCollectionFilterOptions` reports every OTHER lens as absent and the toolbar renders
 * it disabled. A disabled chip cannot be clicked, so the viewer would be stuck on their first
 * pick until they hit the bulk reset.
 */
import '@testing-library/jest-dom';

import { act, render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/glass',
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

/**
 * Stands in for the real grid (and the filter bar nested inside it): exposes the availability the
 * page computed, plus a button that selects a lens through the page's own `onFilterChange`. Going
 * through the context drives the real state machine rather than re-implementing it here.
 */
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useCollectionFilter } = jest.requireActual<{
    useCollectionFilter: () => {
      filteredAvailable: { lenses: readonly string[] } | null;
      onFilterChange: (update: { selectedLenses: readonly string[] }) => void;
    } | null;
  }>('@/app/components/ContentCollection/CollectionFilterContext');

  const MockGrid = () => {
    const ctx = useCollectionFilter();
    return (
      <div>
        <div
          data-testid="grid"
          data-available-lenses={
            ctx?.filteredAvailable ? ctx.filteredAvailable.lenses.join(',') : 'NONE'
          }
        />
        <button type="button" onClick={() => ctx?.onFilterChange({ selectedLenses: ['35mm'] })}>
          pick-35mm
        </button>
      </div>
    );
  };
  return { __esModule: true, default: MockGrid };
});

function image(id: number, lens: string): AnyContentModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example/photo-${id}.jpg`,
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    lens: { id, name: lens },
    rating: 0,
  } as unknown as AnyContentModel;
}

/** Three lenses, so no single lens blankets the collection (`canFilter` stays true). */
function makeThreeLensCollection(): CollectionModel {
  return {
    id: 9,
    slug: 'glass',
    title: 'Glass',
    isClient: false,
    isBlog: false,
    displayMode: 'ORDERED',
    rowsWide: 4,
    locations: [],
    content: [
      image(1, '35mm'),
      image(2, '35mm'),
      image(3, '50mm'),
      image(4, '85mm'),
      image(5, '85mm'),
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as CollectionModel;
}

describe('CollectionPageClient -- lens availability', () => {
  it('keeps every other lens available once one lens is selected', () => {
    render(<CollectionPageClient collection={makeThreeLensCollection()} />);

    act(() => {
      screen.getByRole('button', { name: 'pick-35mm' }).click();
    });

    const available = screen.getByTestId('grid').getAttribute('data-available-lenses');
    // The active pick AND both alternatives must stay reachable — otherwise switching lenses is
    // impossible, since the toolbar disables an unavailable chip.
    expect(available).toContain('35mm');
    expect(available).toContain('50mm');
    expect(available).toContain('85mm');
  });
});
