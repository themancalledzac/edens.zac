'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { SavesProvider } from '@/app/components/Personal/SavesContext';
import { type ToolbarSection } from '@/app/components/ui/FilterToolbar/FilterToolbar';
import {
  DENSITY_TIERS,
  fromMobileDensity,
  LAYOUT,
  nearestDensityTier,
  toMobileDensity,
} from '@/app/constants';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { useViewport } from '@/app/hooks/useViewport';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ContentGifModel } from '@/app/types/Content';
import {
  type FilterState,
  INITIAL_FILTER_STATE,
  initialDateSortDirection,
} from '@/app/types/GalleryFilter';
import { clamp } from '@/app/utils/clamp';
import {
  applyCollectionFilters,
  buildCollectionCriteria,
  type CollectionFilterDimensions,
  computeFilterVisibility,
  extractCollectionFilterOptions,
  hasAnyActiveFilter,
  hasFilterableOptions,
  isDateable,
  isImageContent,
  mergeDateSortedImages,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { getMeanWidthCost } from '@/app/utils/contentRatingUtils';
import { isContentCollection, isGifContent } from '@/app/utils/contentTypeGuards';
import {
  canDownloadCollection,
  findMembership,
  isClientOfCollection,
} from '@/app/utils/galleryAccess';
import { toggleImageSelection } from '@/app/utils/imageSelection';
import { logger } from '@/app/utils/logger';
import { buildPinnedSelects } from '@/app/utils/pinnedSelects';
import { sortByDate } from '@/app/utils/sortByDate';

import {
  type ClientGalleryDownloadContextValue,
  ClientGalleryDownloadProvider,
} from './ClientGalleryDownloadContext';
import { CollectionFilterProvider, type CollectionInfoOptions } from './CollectionFilterContext';
import styles from './CollectionPageClient.module.scss';
import { CollectionRailProvider } from './CollectionRailContext';
import { SelectsProvider } from './SelectsContext';

/**
 * The entire edit experience (useCollectionEdit, EditBar, edit sheet, modals, inline-edit
 * context) lives in EditModeLayer, loaded as a separate client-only chunk so public visitors
 * never download admin code. editMode is server-gated to local dev, so on public pages this
 * dynamic factory is never invoked and the chunk is never requested.
 */
const EditModeLayer = dynamic(() => import('./edit/EditModeLayer'), { ssr: false });

interface CollectionPageClientProps {
  collection: CollectionModel;
  chunkSize?: number;
  /** SSR fallback viewport, forwarded to Component. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
  /**
   * When true, mount the consolidated edit experience (EditBar, edit sheet, image/text modals,
   * click-routing) on this light surface via the dynamically imported EditModeLayer. When
   * false/absent the page renders byte-identically to the public view and no edit code is
   * loaded.
   */
  editMode?: boolean;
  /** Server-resolved principal, surfaced to deep client consumers via {@link MeProvider}. */
  me?: MeResponse | null;
  /** The viewer's persisted selected image ids for THIS collection, seeded server-side. */
  initialSelectedIds?: number[];
  /** The viewer's GLOBAL saved (bookmarked) image ids, seeded server-side. Cross-collection. */
  initialSavedImageIds?: number[];
  /**
   * Mutually-exclusive page sections for a sectioned surface (`/user`). Passing these renders the
   * shared filter bar even on a page with no facet dimensions of its own, with the sections as
   * navigating chips at its head. Absent on ordinary collection pages.
   */
  sections?: readonly ToolbarSection[];
  /** Key of the section currently rendered. Required alongside {@link sections}. */
  activeSectionKey?: string;
  /**
   * Extra content for the header rail — the TEXT block leading the first row, beside the cover.
   * Use it for what is *about* this page rather than *in* it, alongside the date, location,
   * description and filter bar that already live there. `/user` puts its Account and Admin cards
   * here. See {@link CollectionRailProvider}.
   */
  railExtras?: ReactNode;
  /**
   * Render the shared filter bar even when this collection surfaces no facet dimensions.
   *
   * For index surfaces (`/collections`) the bar is part of the page's identity, not a bonus that
   * appears when the payload happens to carry tags or cameras. Without this, whether the page has
   * a bar depends on backend-supplied aggregates on the child blocks, which is not something a
   * page's layout should hinge on. Ordinary collection pages leave it off and keep the existing
   * "bar only when there is something to filter" behaviour.
   */
  alwaysShowFilterBar?: boolean;
}

export default function CollectionPageClient({
  collection,
  chunkSize,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
  editMode = false,
  me = null,
  initialSelectedIds = [],
  initialSavedImageIds = [],
  sections,
  activeSectionKey,
  railExtras = null,
  alwaysShowFilterBar = false,
}: CollectionPageClientProps) {
  // Public grid is the loading fallback until EditModeLayer mounts and takes over.
  const [editLayerMounted, setEditLayerMounted] = useState(false);
  const handleEditLayerMounted = useCallback(() => setEditLayerMounted(true), []);

  const { initialCriteria, syncToUrl } = useFilterUrlState();

  // CHRONOLOGICAL collections are inherently date-ordered, so on the PUBLIC view their Date
  // filter defaults ON (oldest-first) and toggles only between directions. Edit mode is excluded:
  // an admin manages order against the LIVE displayMode (which may have been converted away from
  // CHRONOLOGICAL), so auto-engaging date sort there would revert saved manual reorders.
  const isChronological = !editMode && collection.displayMode === 'CHRONOLOGICAL';

  const [filterState, setFilterState] = useState<FilterState>(() => ({
    ...INITIAL_FILTER_STATE,
    dateSortDirection: editMode ? 'off' : initialDateSortDirection(collection.displayMode),
    highlyRatedOnly: initialCriteria.minRating !== undefined && initialCriteria.minRating >= 4,
    selectedPeople: initialCriteria.people ?? [],
    selectedCameras: initialCriteria.cameras ?? [],
    selectedLocations: initialCriteria.locations ?? [],
    selectedDates: initialCriteria.dates ?? [],
  }));

  // Clamped to the slider's own range: `density` is both the layout budget AND the slider's value,
  // so a seed outside 1..maxDensityDesktop leaves the control pinned at an end stop reporting a
  // number the page is not using. `/user` seeded 14 against a max of 10 while its bar was
  // suppressed, and the mismatch only became visible once the bar rendered.
  const [density, setDensity] = useState(
    clamp(chunkSize ?? LAYOUT.defaultChunkSize, LAYOUT.minDensity, LAYOUT.maxDensityDesktop)
  );

  const measured = useViewport();
  const isMobile = measured.width > 0 ? measured.isMobile : (serverIsMobile ?? false);

  const mobileDensity = toMobileDensity(density);
  const displayDensity = isMobile ? mobileDensity : density;
  const densityMax = isMobile ? LAYOUT.maxDensityMobile : LAYOUT.maxDensityDesktop;

  const handleDensityChange = useCallback(
    (value: number) => {
      setDensity(
        isMobile
          ? fromMobileDensity(value)
          : Math.max(LAYOUT.minDensity, Math.min(LAYOUT.maxDensityDesktop, Math.round(value)))
      );
    },
    [isMobile]
  );

  /**
   * Photo-size presets on the CANONICAL desktop scale, which is the scale `density` is stored in.
   *
   * Deliberately not viewport-scaled like the slider: halving and doubling is lossy at the Small
   * tier (desktop 7 -> mobile 4 -> back to 8), so routing a tier through
   * {@link fromMobileDensity} would land a mobile visitor on a value no tier defines. Tier
   * selections therefore bypass {@link handleDensityChange} and write their canonical value.
   */
  const densityTiers = useMemo(
    () => DENSITY_TIERS.map(tier => ({ key: tier.key, label: tier.label, value: tier.desktop })),
    []
  );

  const handleDensityTierSelect = useCallback((value: number) => {
    setDensity(clamp(value, LAYOUT.minDensity, LAYOUT.maxDensityDesktop));
  }, []);

  const activeDensityTier = nearestDensityTier(density, false);

  const isClientGallery = collection.isClient === true;

  // A CLIENT grant on a collection whose payload carries no kind booleans is the signature of a
  // stale payload in flight (pre-#132 cache entry, or a deploy-order slip): the grant proves the
  // collection is a client gallery, so Selects are being withheld from someone entitled to them.
  if (collection.isClient === undefined && findMembership(me, collection.id)) {
    logger.warn('CollectionPageClient', 'Membership held on a payload missing isClient', {
      collectionId: collection.id,
    });
  }

  // Selects (favorites) are a client-gallery feature, available only to a viewer who is a CLIENT
  // of this collection (or admin via editMode). Distinct from the download "select mode" below.
  const selectsEnabled =
    isClientGallery && !editMode && isClientOfCollection(me, collection.id, editMode);

  // Download UI (and its select-to-download mode) follows the backend's authorization: a logged-in
  // CLIENT of this collection (via /api/auth/me), or an anonymous viewer whose gallery password
  // cookie validated. Distinct from `isClientGallery` (the collection flag), which still governs
  // Selects/favorites above.
  const canDownload = canDownloadCollection(me, collection);

  // Mirror of the viewer's selected ids, owned here so the pinned "Your Selects" prepend can react
  // to toggles. SelectsProvider is seeded from the same initial list and notifies us via onChange.
  const [pinnedSelectedIds, setPinnedSelectedIds] = useState<number[]>(initialSelectedIds);

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectToggle = useCallback((imageId: number) => {
    setSelectedIds(prev => toggleImageSelection(imageId, prev));
  }, []);

  const enterSelectMode = useCallback(() => setIsSelectMode(true), []);
  const exitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds([]);
  }, []);

  const downloadContextValue = useMemo<ClientGalleryDownloadContextValue>(
    () => ({ isSelectMode, selectedIds, enterSelectMode, exitSelectMode }),
    [isSelectMode, selectedIds, enterSelectMode, exitSelectMode]
  );

  // Live content from EditModeLayer — filter options must match what the edit grid renders
  // so in-session uploads and tag edits surface in the filter UI.
  const [liveEditContent, setLiveEditContent] = useState<AnyContentModel[] | null>(null);

  // Public render works off the server seed; edit mode tracks the layer's live content.
  const allContent = useMemo(
    () => (editMode && liveEditContent ? liveEditContent : (collection.content ?? [])),
    [editMode, liveEditContent, collection.content]
  );

  const allImages = useMemo(() => allContent.filter(isImageContent), [allContent]);

  const allCollections = useMemo(() => allContent.filter(isContentCollection), [allContent]);

  // GIFs/MP4s with a captureDate contribute their day to the `dates` dimension only -- see
  // extractCollectionFilterOptions. A GIF carries no camera or lens, and the tag/people/location/
  // rating dimensions have always been sourced from images alone, so it must never feed any
  // dimension other than `dates`.
  const datedGifs = useMemo(
    () =>
      allContent.filter(
        (item): item is ContentGifModel => isGifContent(item) && Boolean(item.captureDate)
      ),
    [allContent]
  );

  const visibility = useMemo(() => computeFilterVisibility(allImages), [allImages]);

  // D7: image-derived dimensions are shown whenever the page has ANY image, and no explicit
  // suppression is needed to hide them otherwise — `extractCollectionFilterOptions` sources
  // cameras/lenses from `allImages` alone, so a page with no images already yields
  // empty values, and every consumer gates on `values.length`. The former
  // `allCollections.length > allImages.length` comparison was constant per collection under the
  // typed model; under mixed content it flips with a single content edit, so a sixth photo would
  // make the Camera/Lens dropdowns reappear.
  const baseCollectionOptions = useMemo<CollectionFilterDimensions>(
    () => extractCollectionFilterOptions(allImages, allCollections, datedGifs),
    [allImages, allCollections, datedGifs]
  );

  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria);
  }, [allContent, allImages, criteria, hasActiveFilters]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  /**
   * Photos-per-row anchor, measured on the UNFILTERED content.
   *
   * Width-cost scales with rating, so without this a filter that shifts the rating mix silently
   * resized every photo: "Highly Rated" alone took a collection from ~5 per row to ~3, while the
   * photo-size control still read Medium. The layout divides the filtered mean by this to cancel
   * that shift; with no filter active the two are equal, so the layout is unchanged.
   */
  const widthCostBaseline = useMemo(() => getMeanWidthCost(allContent), [allContent]);

  // `visibility.highlyRated` is already false below two images (canFilter), so no extra
  // collection-count suppression is needed — see D7.
  const showHighlyRated = visibility.highlyRated;
  const showDateSort = visibility.dateSort;

  const filteredAvailableOptions = useMemo(() => {
    if (!hasActiveFilters) return null;
    const dims = extractCollectionFilterOptions(filteredImages, allCollections);

    // `dates` and `lenses` are single-valued per image, so each is SELF-EXCLUSIVE: deriving its
    // availability from `filteredImages` -- which already reflects that dimension's own active
    // selection -- collapses every other option to "unavailable" the instant one is picked, and a
    // disabled chip cannot be switched to. Re-derive each from a pass with its OWN key omitted, so
    // its options never grey each other out while an option ruled out by a DIFFERENT active filter
    // (e.g. camera) still greys out correctly. Both are single-choice in the toolbar
    // (`EXCLUSIVE_FILTER_KEYS`), which is what makes switching the only reachable move.
    const availabilityWithout = (key: 'dates' | 'lenses'): CollectionFilterDimensions => {
      const { [key]: _omitted, ...selfExcluded } = criteria;
      const content = applyCollectionFilters(allContent, allImages, selfExcluded);
      const gifs = content.filter(
        (item): item is ContentGifModel => isGifContent(item) && Boolean(item.captureDate)
      );
      return extractCollectionFilterOptions(content.filter(isImageContent), allCollections, gifs);
    };

    return {
      people: dims.people.values,
      cameras: dims.cameras.values,
      lenses: availabilityWithout('lenses').lenses.values,
      locations: dims.locations.values,
      dates: availabilityWithout('dates').dates.values,
    };
  }, [hasActiveFilters, filteredImages, allCollections, criteria, allContent, allImages]);

  const availableOptions = useMemo<CollectionInfoOptions>(
    () => ({
      ...baseCollectionOptions,
      showHighlyRated,
      showDateSort,
    }),
    [baseCollectionOptions, showHighlyRated, showDateSort]
  );

  const contentBlocks = useMemo(() => {
    const processed = processContentBlocks(
      filteredContent,
      true,
      collection.id,
      collection.displayMode
    );

    const ordered =
      filterState.dateSortDirection === 'off'
        ? processed
        : mergeDateSortedImages(
            processed,
            sortByDate(processed.filter(isDateable), filterState.dateSortDirection)
          );

    if (!selectsEnabled || pinnedSelectedIds.length === 0) {
      return ordered;
    }

    // Pinned "Your Selects" region: duplicated, marked clones of the selected images, prepended so
    // they sit at the top while the originals still render in place. The marker only affects the
    // React key (see Component.tsx) — layout treats them as normal image blocks.
    const pinned = buildPinnedSelects(ordered, new Set(pinnedSelectedIds));
    return [...pinned, ...ordered];
  }, [
    filteredContent,
    collection.id,
    collection.displayMode,
    filterState.dateSortDirection,
    selectsEnabled,
    pinnedSelectedIds,
  ]);

  const handleFilterChange = useCallback(
    (update: Partial<FilterState>) => {
      setFilterState(prev => {
        const next = { ...prev, ...update };
        syncToUrl(buildCollectionCriteria(next));
        return next;
      });
    },
    [syncToUrl]
  );

  const filterContextValue = useMemo(
    () => ({
      filterState,
      filterOptions: availableOptions,
      filteredAvailable: filteredAvailableOptions,
      onFilterChange: handleFilterChange,
      sections: sections ?? null,
      activeSectionKey: activeSectionKey ?? null,
      dateTwoState: isChronological,
      density: displayDensity,
      densityMax,
      onDensityChange: handleDensityChange,
      // Curators keep the fine 1-10 control so they can still land on an off-tier value; visitors
      // get the three photo-size presets.
      densityVariant: editMode ? ('slider' as const) : ('tiers' as const),
      densityTiers,
      activeDensityTier,
      onDensityTierSelect: handleDensityTierSelect,
    }),
    [
      filterState,
      availableOptions,
      filteredAvailableOptions,
      handleFilterChange,
      sections,
      activeSectionKey,
      isChronological,
      displayDensity,
      densityMax,
      handleDensityChange,
      editMode,
      densityTiers,
      activeDensityTier,
      handleDensityTierSelect,
    ]
  );

  const pageSize = collection.contentPerPage ?? 30;

  // Sections alone justify the bar: a sectioned page needs its section chips even with no facet
  // dimensions of its own, and rendering the bar is also what gives it the shared chrome (the
  // density slider) that makes it match an ordinary collection page.
  const hasOptions =
    alwaysShowFilterBar ||
    (sections !== undefined && sections.length > 0) ||
    hasFilterableOptions(baseCollectionOptions, showHighlyRated, showDateSort);

  const grid = (
    <ContentBlockWithFullScreen
      content={contentBlocks}
      priorityBlockIndex={0}
      // In edit mode this element is the loading fallback while the edit chunk streams in, and
      // a tap during that window must not open the viewer the layer will immediately tear down
      // — edit mode keeps fullscreen disabled from first paint (the layer's grid also does).
      enableFullScreenView={!editMode}
      initialPageSize={pageSize}
      chunkSize={density}
      mobileChunkSize={mobileDensity}
      collectionSlug={collection.slug}
      collectionData={collection}
      // The filter bar and the download row both mount into the header's metadata rail, so the
      // rail has to exist whenever either will render — even on a collection with no metadata
      // text of its own. Without this, `/user` (no date, no locations, no siblings) built a
      // cover-only header and silently dropped the bar.
      forceHeaderRail={hasOptions || canDownload}
      widthCostBaseline={widthCostBaseline}
      serverContentWidth={serverContentWidth}
      serverViewportHeight={serverViewportHeight}
      serverIsMobile={serverIsMobile}
      selectedIds={canDownload ? selectedIds : undefined}
      onImageClick={canDownload && isSelectMode ? handleSelectToggle : undefined}
    />
  );

  const content = editMode ? (
    <>
      {!editLayerMounted && grid}
      <EditModeLayer
        collection={collection}
        chunkSize={density}
        mobileChunkSize={mobileDensity}
        filterState={filterState}
        setFilterState={setFilterState}
        syncToUrl={syncToUrl}
        onMounted={handleEditLayerMounted}
        onLiveContentChange={setLiveEditContent}
      />
    </>
  ) : (
    <>
      {grid}
      {hasActiveFilters && filteredImages.length === 0 && (
        <p className={styles.emptyState}>No images match your filters.</p>
      )}
    </>
  );

  const withSelects = selectsEnabled ? (
    <SelectsProvider
      collectionId={collection.id}
      initialSelectedIds={initialSelectedIds}
      onChange={setPinnedSelectedIds}
    >
      {content}
    </SelectsProvider>
  ) : (
    content
  );

  const maybeWrappedContent =
    canDownload && !editMode ? (
      <ClientGalleryDownloadProvider value={downloadContextValue}>
        {withSelects}
      </ClientGalleryDownloadProvider>
    ) : (
      withSelects
    );

  // Always mount the provider and gate the filter UI via a null VALUE (observationally the same
  // for consumers, which null-check). hasOptions is live in edit mode — it flips when an upload
  // gives an empty collection its first filterable content — and conditionally mounting the
  // provider on it would reparent the subtree, remounting EditModeLayer and resetting its state.
  // Saves (bookmarks) are cross-collection and available to ANY logged-in viewer, so mount the
  // provider whenever a principal is present — independent of the client-gallery-scoped Selects.
  const withSaves = me ? (
    <SavesProvider initialSavedIds={initialSavedImageIds}>{maybeWrappedContent}</SavesProvider>
  ) : (
    maybeWrappedContent
  );

  return (
    <MeProvider me={me}>
      <CollectionFilterProvider value={hasOptions ? filterContextValue : null}>
        <CollectionRailProvider value={railExtras}>{withSaves}</CollectionRailProvider>
      </CollectionFilterProvider>
    </MeProvider>
  );
}
