/**
 * Regression test for whole-branch review Finding 1 (CRITICAL): selecting one date must not
 * grey out every other date chip.
 *
 * `dates` is OR-combined and single-valued per image (a photo was captured on exactly one
 * calendar day), unlike camera/lens/people/location, which are AND-combined. Deriving the
 * bar's `filteredAvailable.dates` from `filteredImages` -- the images surviving the CURRENT
 * criteria, which already includes an active `dates` selection -- collapses every surviving
 * image onto the selected day(s), so `extractCollectionFilterOptions` reports every OTHER day
 * as absent and the toolbar renders it disabled. That defeats the multi-day conference case
 * (pick day 1 and day 3): after picking day 1, day 3's chip goes disabled and is unreachable
 * except via the bulk reset.
 */
import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel } from '@/app/types/Content';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/conference',
  // Seeds the collection's selectedDates with day 1 pre-selected, as if the viewer had already
  // clicked the first day's chip (or followed a deep link to it).
  useSearchParams: () => new URLSearchParams('date=2026-07-20'),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useCollectionFilter } = jest.requireActual<{
    useCollectionFilter: () => {
      filteredAvailable: { dates: readonly string[] } | null;
    } | null;
  }>('@/app/components/ContentCollection/CollectionFilterContext');

  const MockGrid = () => {
    const ctx = useCollectionFilter();
    return (
      <div
        data-testid="grid"
        data-available-dates={
          ctx?.filteredAvailable ? ctx.filteredAvailable.dates.join(',') : 'NONE'
        }
      />
    );
  };
  return { __esModule: true, default: MockGrid };
});

function image(id: number, captureDate: string): AnyContentModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example/photo-${id}.jpg`,
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    captureDate,
    rating: 0,
  } as unknown as AnyContentModel;
}

/** A 3-day conference: photos on day 1, day 2, and day 3. */
function makeThreeDayConference(): CollectionModel {
  return {
    id: 7,
    slug: 'conference',
    title: 'Conference',
    isClient: false,
    isBlog: false,
    displayMode: 'ORDERED',
    rowsWide: 4,
    locations: [],
    content: [
      image(1, '2026-07-20T10:00:00'),
      image(2, '2026-07-20T14:00:00'),
      image(3, '2026-07-21T10:00:00'),
      image(4, '2026-07-22T10:00:00'),
      image(5, '2026-07-22T14:00:00'),
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as CollectionModel;
}

describe('CollectionPageClient -- date availability (Finding 1 regression)', () => {
  it('keeps every other day available once one day is selected', () => {
    render(<CollectionPageClient collection={makeThreeDayConference()} />);
    const available = screen.getByTestId('grid').getAttribute('data-available-dates');
    // Day 1 (the active selection) and days 2 and 3 must ALL still be reachable -- selecting
    // one day must never grey out the others, or the 3-day-conference case (day 1 + day 3)
    // becomes unreachable except via the bulk reset.
    expect(available).toContain('2026-07-20');
    expect(available).toContain('2026-07-21');
    expect(available).toContain('2026-07-22');
  });
});
