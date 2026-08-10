/**
 * A sectioned page switches sections on a MOUNTED grid, and this is the state contract that makes
 * that safe.
 *
 * `/user` and `/admin/users/[id]` swap `collection.content` for a different section's blocks while
 * leaving `CollectionPageClient` mounted. It used to pass `key={activeKey}` instead, which tore the
 * grid down and rebuilt it — and the intermediate frame holding no grid collapsed the document
 * height to the header, so the browser clamped `scrollY` and threw the viewer toward the top on
 * every section switch. Dropping the key fixed the scroll, and handed this component the job the
 * remount used to do for free: forgetting the previous section's view state.
 *
 * Two halves, both asserted here:
 *
 *  - WHAT is forgotten. Filters, select mode and the selection are facts about one section's
 *    contents, so they reset. Photo size is a viewer preference about how they want to read the
 *    page, so it survives — that asymmetry is the whole point, and a reset that took density with
 *    it would be just as wrong as one that kept the filters.
 *  - WHEN. The reset is written render-phase (React's documented "adjust state on prop change"
 *    pattern) rather than in an effect, so the new section's first committed render is already
 *    correct instead of flashing the previous section's filters for a frame.
 *
 * Every reset assertion is paired with the same interaction under a re-render that does NOT change
 * the section, because a reset that fired on every render would satisfy the first half alone while
 * wiping a facet the moment anything else re-rendered the page.
 *
 * The fixture is a downloadable client gallery. No shipping page is both sectioned and a client
 * gallery, but `isSelectMode`/`selectedIds` are owned by the download context and reachable from
 * nowhere else, so the flags are set purely to make that state observable. The rest of the fixture
 * is an ordinary sectioned page.
 */
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionPageClient from '@/app/components/ContentCollection/CollectionPageClient';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import type { CollectionModel } from '@/app/types/Collection';
import type { AnyContentModel } from '@/app/types/Content';

/**
 * One entry per committed render of the grid, so the timing half of the contract is checkable:
 * an effect-based reset would leave an entry pairing the NEW section key with the OLD filters.
 */
const mockRenderLog: string[] = [];

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/user',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

/**
 * The grid stands in for every consumer of the two contexts this state reaches: it reads them,
 * logs what it saw, and offers real controls that drive them the way the shipping UI does — the
 * filter bar through `onFilterChange`/`onDensityTierSelect`, the download bar through
 * `enterSelectMode`, and the grid's own image taps through the `onImageClick` prop.
 */
jest.mock('@/app/components/Content/ContentBlockWithFullScreen', () => {
  const { useCollectionFilter } = jest.requireActual<{
    useCollectionFilter: () => {
      filterState: { selectedCameras: readonly string[]; highlyRatedOnly: boolean };
      activeSectionKey: string | null;
      activeDensityTier: string;
      densityTiers: readonly { key: string; label: string; value: number }[];
      onFilterChange: (update: { selectedCameras?: string[]; highlyRatedOnly?: boolean }) => void;
      onDensityTierSelect: (value: number) => void;
    } | null;
  }>('@/app/components/ContentCollection/CollectionFilterContext');

  const { useClientGalleryDownload } = jest.requireActual<{
    useClientGalleryDownload: () => {
      isSelectMode: boolean;
      selectedIds: readonly number[];
      enterSelectMode: () => void;
    } | null;
  }>('@/app/components/ContentCollection/ClientGalleryDownloadContext');

  const MockGrid = ({ onImageClick }: { onImageClick?: (imageId: number) => void }) => {
    const filter = useCollectionFilter();
    const download = useClientGalleryDownload();
    if (!filter || !download) return <p>No context</p>;

    const cameras = filter.filterState.selectedCameras.join(', ') || 'none';
    const selected = download.selectedIds.join(', ') || 'none';
    mockRenderLog.push(
      [
        filter.activeSectionKey ?? 'unsectioned',
        `cameras=${cameras}`,
        `highlyRated=${filter.filterState.highlyRatedOnly ? 'on' : 'off'}`,
        `selectMode=${download.isSelectMode ? 'on' : 'off'}`,
        `selected=${selected}`,
        `photoSize=${filter.activeDensityTier}`,
      ].join(' ')
    );

    return (
      <div>
        <p>Cameras: {cameras}</p>
        <p>Highly rated: {filter.filterState.highlyRatedOnly ? 'on' : 'off'}</p>
        <p>Select mode: {download.isSelectMode ? 'on' : 'off'}</p>
        <p>Selected: {selected}</p>
        <p>Photo size: {filter.activeDensityTier}</p>
        <p>Blocks: {filter.activeSectionKey}</p>

        <button type="button" onClick={() => filter.onFilterChange({ selectedCameras: ['Leica'] })}>
          Filter to Leica
        </button>
        <button type="button" onClick={() => filter.onFilterChange({ highlyRatedOnly: true })}>
          Highly rated only
        </button>
        {filter.densityTiers.map(tier => (
          <button
            key={tier.key}
            type="button"
            onClick={() => filter.onDensityTierSelect(tier.value)}
          >
            {tier.label}
          </button>
        ))}
        <button type="button" onClick={download.enterSelectMode}>
          Select images
        </button>
        <button type="button" onClick={() => onImageClick?.(1)}>
          Tap image one
        </button>
        <button type="button" onClick={() => onImageClick?.(2)}>
          Tap image two
        </button>
      </div>
    );
  };

  return { __esModule: true, default: MockGrid };
});

const SECTIONS: ToolbarSection[] = [
  { key: 'collections', label: 'Collections', count: 2, href: '/user?tab=collections' },
  { key: 'images', label: 'Images', count: 1, href: '/user?tab=images' },
];

function image(id: number, camera: string): AnyContentModel {
  return {
    id,
    contentType: 'IMAGE',
    orderIndex: id,
    imageUrl: `https://cdn.example/photo-${id}.jpg`,
    imageWidth: 1600,
    imageHeight: 1067,
    locations: [],
    camera: { id, name: camera },
    rating: 4,
    visible: true,
  } as unknown as AnyContentModel;
}

/**
 * `isClient` + `isPasswordProtected` + a content array is what `canDownloadCollection` accepts as
 * a validated password-cookie client, and it is the only route to a mounted download context.
 */
function sectionCollection(content: AnyContentModel[]): CollectionModel {
  return {
    id: 42,
    slug: 'user',
    title: 'Your Space',
    displayMode: 'ORDERED',
    isClient: true,
    isBlog: false,
    isPasswordProtected: true,
    locations: [],
    content,
  } as unknown as CollectionModel;
}

const COLLECTIONS_BLOCKS = [image(1, 'Leica'), image(2, 'Nikon')];
const IMAGES_BLOCKS = [image(3, 'Leica')];

const ssr = { serverContentWidth: 1200, serverViewportHeight: 900, serverIsMobile: false };

function renderSectioned(activeSectionKey = 'collections', content = COLLECTIONS_BLOCKS) {
  return render(
    <CollectionPageClient
      collection={sectionCollection(content)}
      {...ssr}
      sections={SECTIONS}
      activeSectionKey={activeSectionKey}
    />
  );
}

type Rerender = ReturnType<typeof renderSectioned>['rerender'];

function switchTo(rerender: Rerender, activeSectionKey: string, content: AnyContentModel[]) {
  rerender(
    <CollectionPageClient
      collection={sectionCollection(content)}
      {...ssr}
      sections={SECTIONS}
      activeSectionKey={activeSectionKey}
    />
  );
}

beforeEach(() => {
  mockRenderLog.length = 0;
});

describe('CollectionPageClient — a section switch forgets the previous section', () => {
  it('clears a facet chosen in the section being left', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));
    expect(screen.getByText('Cameras: Leica')).toBeInTheDocument();

    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(screen.getByText('Cameras: none')).toBeInTheDocument();
  });

  // The control. A reset that fired on every render would pass the assertion above while wiping a
  // facet whenever anything else re-rendered the page — a viewport resize, a save toggle.
  it('keeps that facet when the same section re-renders with different content', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));

    switchTo(rerender, 'collections', [...COLLECTIONS_BLOCKS, image(9, 'Leica')]);

    expect(screen.getByText('Cameras: Leica')).toBeInTheDocument();
  });

  it('clears the highly-rated toggle', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Highly rated only' }));
    expect(screen.getByText('Highly rated: on')).toBeInTheDocument();

    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(screen.getByText('Highly rated: off')).toBeInTheDocument();
  });

  it('keeps the highly-rated toggle across a re-render of the same section', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Highly rated only' }));

    switchTo(rerender, 'collections', IMAGES_BLOCKS);

    expect(screen.getByText('Highly rated: on')).toBeInTheDocument();
  });

  /**
   * Select mode is the one that would misfire rather than merely look stale: a selection armed in
   * one section stays armed in the next, against ids that are no longer on screen.
   */
  it('leaves select mode and drops the selection', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Select images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap image one' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap image two' }));
    expect(screen.getByText('Select mode: on')).toBeInTheDocument();
    expect(screen.getByText('Selected: 1, 2')).toBeInTheDocument();

    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(screen.getByText('Select mode: off')).toBeInTheDocument();
    expect(screen.getByText('Selected: none')).toBeInTheDocument();
  });

  it('keeps select mode and the selection when the same section re-renders', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Select images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap image one' }));

    switchTo(rerender, 'collections', IMAGES_BLOCKS);

    expect(screen.getByText('Select mode: on')).toBeInTheDocument();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();
  });
});

/**
 * The other half of the same contract, and the reason the reset is a list of three `setState`
 * calls rather than a fresh mount: photo size is a preference about how the viewer wants to read
 * the page, not a fact about the section they happen to be on.
 */
describe('CollectionPageClient — a section switch keeps the photo size', () => {
  it('opens at the default tier, so a chosen tier is a real change', () => {
    renderSectioned();
    expect(screen.getByText('Photo size: medium')).toBeInTheDocument();
  });

  it('carries the chosen tier through a section switch that resets everything else', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Small photos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));
    expect(screen.getByText('Photo size: small')).toBeInTheDocument();

    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(screen.getByText('Photo size: small')).toBeInTheDocument();
    expect(screen.getByText('Cameras: none')).toBeInTheDocument();
  });

  it('carries it across repeated switches, including back to where it started', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Large photos' }));

    switchTo(rerender, 'images', IMAGES_BLOCKS);
    switchTo(rerender, 'collections', COLLECTIONS_BLOCKS);

    expect(screen.getByText('Photo size: large')).toBeInTheDocument();
  });
});

/**
 * Why the reset is written render-phase.
 *
 * An effect-based reset commits the new section's content beside the OLD filter state first, then
 * corrects itself — a visible frame of the previous section's facets applied to blocks they were
 * never chosen for. The render log is one entry per committed render, so that intermediate frame
 * would show up as an extra entry pairing the new section key with the stale state.
 */
describe('CollectionPageClient — the new section never renders with the old filters', () => {
  it('commits the switched-to section exactly once, already reset', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap image one' }));
    fireEvent.click(screen.getByRole('button', { name: 'Small photos' }));

    const before = mockRenderLog.length;
    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(mockRenderLog.slice(before)).toEqual([
      'images cameras=none highlyRated=off selectMode=off selected=none photoSize=small',
    ]);
  });

  // The control for the log itself: it does record dirty state, so an empty-looking pass above is
  // the reset working rather than the log never seeing a filter in the first place.
  it('records the dirty state while the page is still on the section that owns it', () => {
    renderSectioned();
    const before = mockRenderLog.length;
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));

    expect(mockRenderLog.slice(before)).toEqual([
      'collections cameras=Leica highlyRated=off selectMode=off selected=none photoSize=medium',
    ]);
  });

  it('never commits a render pairing the new section with the previous section’s facet', () => {
    const { rerender } = renderSectioned();
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));

    switchTo(rerender, 'images', IMAGES_BLOCKS);

    expect(mockRenderLog.filter(entry => entry.startsWith('images cameras=Leica'))).toEqual([]);
  });
});

/**
 * An unsectioned collection page passes no `activeSectionKey` at all, so `renderedSectionKey`
 * starts and stays `undefined`. Nothing may reset there — an ordinary page re-renders constantly.
 */
describe('CollectionPageClient — an unsectioned page is untouched by any of this', () => {
  const renderPlain = (content: AnyContentModel[]) =>
    render(<CollectionPageClient collection={sectionCollection(content)} {...ssr} />);

  it('keeps a chosen facet across a content change with no section key in play', () => {
    const { rerender } = renderPlain(COLLECTIONS_BLOCKS);
    fireEvent.click(screen.getByRole('button', { name: 'Filter to Leica' }));

    rerender(<CollectionPageClient collection={sectionCollection(IMAGES_BLOCKS)} {...ssr} />);

    expect(screen.getByText('Cameras: Leica')).toBeInTheDocument();
  });

  it('keeps select mode and the selection too', () => {
    const { rerender } = renderPlain(COLLECTIONS_BLOCKS);
    fireEvent.click(screen.getByRole('button', { name: 'Select images' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tap image one' }));

    rerender(<CollectionPageClient collection={sectionCollection(IMAGES_BLOCKS)} {...ssr} />);

    expect(screen.getByText('Select mode: on')).toBeInTheDocument();
    expect(screen.getByText('Selected: 1')).toBeInTheDocument();
  });
});
