'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { fromMobileDensity, LAYOUT, toMobileDensity } from '@/app/constants';
import { useFilterUrlState } from '@/app/hooks/useFilterUrlState';
import { useViewport } from '@/app/hooks/useViewport';
import { updateImages } from '@/app/lib/api/content';
import { upsertRatingOverride } from '@/app/lib/api/ratingOverrides';
import { type MeResponse } from '@/app/types/Auth';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';
import {
  type FilterState,
  INITIAL_FILTER_STATE,
  initialDateSortDirection,
  type LensType,
} from '@/app/types/GalleryFilter';
import { canSelect } from '@/app/utils/canSelect';
import {
  applyCollectionFilters,
  buildCollectionCriteria,
  computeFilterVisibility,
  extractCollectionFilterOptions,
  hasAnyActiveFilter,
  hasFilterableOptions,
  isImageContent,
  mergeDateSortedImages,
} from '@/app/utils/contentFilter';
import { processContentBlocks } from '@/app/utils/contentLayout';
import { isContentCollection } from '@/app/utils/contentTypeGuards';
import { useThrottle } from '@/app/utils/debounce';
import { toggleImageSelection } from '@/app/utils/imageSelection';
import { buildPinnedSelects } from '@/app/utils/pinnedSelects';
import {
  canEditCanonical,
  canEditRating,
  type RatingDrag,
  resolveRatings,
} from '@/app/utils/ratingControl';
import { sortByDate } from '@/app/utils/sortByDate';

import {
  type ClientGalleryDownloadContextValue,
  ClientGalleryDownloadProvider,
} from './ClientGalleryDownloadContext';
import { CollectionFilterProvider, type CollectionInfoOptions } from './CollectionFilterContext';
import styles from './CollectionPageClient.module.scss';
import { type RatingControlContextValue, RatingControlProvider } from './RatingControlContext';
import { SelectsProvider } from './SelectsContext';

/**
 * The entire edit experience (useCollectionEdit, EditBar, edit sheet, modals, inline-edit
 * context) lives in EditModeLayer, loaded as a separate client-only chunk so public visitors
 * never download admin code. editMode is server-gated to local dev, so on public pages this
 * dynamic factory is never invoked and the chunk is never requested.
 */
const EditModeLayer = dynamic(() => import('./edit/EditModeLayer'), { ssr: false });

type CollectionDimensions = Omit<CollectionInfoOptions, 'showHighlyRated' | 'showDateSort'>;

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
  /** Server-seeded per-user rating overrides (contentId -> rating) for client viewers. */
  seededOverrides?: Array<[number, number]>;
}

const EMPTY_STRING_DIM = { values: [] as readonly string[], filterable: true };
const EMPTY_LENSTYPE_DIM = { values: [] as readonly LensType[], filterable: true };

export default function CollectionPageClient({
  collection,
  chunkSize,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
  editMode = false,
  me = null,
  initialSelectedIds = [],
  seededOverrides,
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
    selectedTags: initialCriteria.tags ?? [],
    selectedPeople: initialCriteria.people ?? [],
    selectedCameras: initialCriteria.cameras ?? [],
    selectedLocations: initialCriteria.locations ?? [],
  }));

  const [density, setDensity] = useState(chunkSize ?? LAYOUT.defaultChunkSize);

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

  const isClientGallery = collection.type === CollectionType.CLIENT_GALLERY;

  // Selects (favorites) are a client-gallery feature, available only to a viewer who canSelect
  // this collection (admin or a grant holder). Distinct from the download "select mode" below.
  const selectsEnabled = isClientGallery && !editMode && canSelect(me, collection.id);

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

  // Rating control (admin edits the canonical rating; a canTag client writes a per-user override).
  // The override map + the in-progress drag both live in state so the contentBlocks useMemo
  // recomputes and the grid re-flows live while dragging. canEdit is false for anonymous/public
  // viewers, so the provider never mounts and the slider never renders there.
  const canEdit = canEditRating(me, collection.id);
  const editsCanonical = canEditCanonical(me);

  const [overrides, setOverrides] = useState<Map<number, number>>(
    () => new Map(seededOverrides ?? [])
  );
  const [drag, setDrag] = useState<RatingDrag | null>(null);

  // Throttle live drag so a continuous slide does not recompute the layout on every pixel.
  const applyDrag = useThrottle((contentId: number, value: number) => {
    setDrag({ contentId, value });
  }, 60);

  const handleRatingDrag = useCallback(
    (contentId: number, value: number) => {
      applyDrag(contentId, value);
    },
    [applyDrag]
  );

  const handleRatingCommit = useCallback(
    (contentId: number, value: number) => {
      setDrag(null);
      if (editsCanonical) {
        // The layout already reflects `value` optimistically via the drag path; persist it. A hard
        // failure self-heals on the next server render, so swallow the error.
        void updateImages([{ id: contentId, rating: value }]).catch(() => {});
        return;
      }
      // Client override: optimistic set, rollback the single entry on failure.
      const prev = overrides.get(contentId);
      setOverrides(m => {
        const next = new Map(m);
        next.set(contentId, value);
        return next;
      });
      void upsertRatingOverride(collection.id, contentId, value).catch(() => {
        setOverrides(m => {
          const next = new Map(m);
          if (prev === undefined) next.delete(contentId);
          else next.set(contentId, prev);
          return next;
        });
      });
    },
    [editsCanonical, overrides, collection.id]
  );

  const resolveRatingForImage = useCallback(
    (contentId: number): number => {
      if (drag?.contentId === contentId) return drag.value;
      const ov = overrides.get(contentId);
      if (ov !== undefined) return ov;
      const item = allImages.find(i => i.id === contentId) as { rating?: number } | undefined;
      return item?.rating ?? 0;
    },
    [drag, overrides, allImages]
  );

  const ratingControlValue = useMemo<RatingControlContextValue>(
    () => ({
      canEdit,
      resolveRatingForImage,
      onDrag: handleRatingDrag,
      onCommit: handleRatingCommit,
    }),
    [canEdit, resolveRatingForImage, handleRatingDrag, handleRatingCommit]
  );

  const isCollectionDominant = allCollections.length > allImages.length;

  const visibility = useMemo(() => computeFilterVisibility(allImages), [allImages]);

  const baseCollectionOptions = useMemo<CollectionDimensions>(() => {
    const options = extractCollectionFilterOptions(allImages, allCollections);
    if (isCollectionDominant) {
      return {
        ...options,
        cameras: EMPTY_STRING_DIM,
        lenses: EMPTY_STRING_DIM,
        lensTypes: EMPTY_LENSTYPE_DIM,
      };
    }
    return options;
  }, [allImages, allCollections, isCollectionDominant]);

  const criteria = useMemo(() => buildCollectionCriteria(filterState), [filterState]);

  const hasActiveFilters = useMemo(() => hasAnyActiveFilter(filterState), [filterState]);

  const filteredContent = useMemo(() => {
    if (!hasActiveFilters) return allContent;
    return applyCollectionFilters(allContent, allImages, criteria, filterState.selectedLensTypes);
  }, [allContent, allImages, criteria, hasActiveFilters, filterState.selectedLensTypes]);

  const filteredImages = useMemo(() => filteredContent.filter(isImageContent), [filteredContent]);

  // Collection-dominant (parent) pages suppress rating even when it varies — too
  // few images for it to be a useful control there.
  const showHighlyRated = visibility.highlyRated && !isCollectionDominant;
  const showDateSort = visibility.dateSort;

  const filteredAvailableOptions = useMemo(() => {
    if (!hasActiveFilters) return null;
    const dims = extractCollectionFilterOptions(filteredImages, allCollections);
    return {
      tags: dims.tags.values,
      people: dims.people.values,
      cameras: dims.cameras.values,
      lenses: dims.lenses.values,
      lensTypes: dims.lensTypes.values,
      locations: dims.locations.values,
    };
  }, [hasActiveFilters, filteredImages, allCollections]);

  const availableOptions = useMemo<CollectionInfoOptions>(
    () => ({
      ...baseCollectionOptions,
      showHighlyRated,
      showDateSort,
    }),
    [baseCollectionOptions, showHighlyRated, showDateSort]
  );

  const contentBlocks = useMemo(() => {
    // Rating (Phase 2): substitute each image's rating with override ?? drag ?? canonical on a
    // shallow clone BEFORE layout, so the grid re-flows live while dragging. No-op (returns the
    // input unchanged by reference) when overrides is empty and drag is null — public render is
    // byte-identical.
    const resolved = resolveRatings(filteredContent, overrides, drag);

    const processed = processContentBlocks(resolved, true, collection.id, collection.displayMode);

    const ordered =
      filterState.dateSortDirection === 'off'
        ? processed
        : mergeDateSortedImages(
            processed,
            sortByDate(processed.filter(isImageContent), filterState.dateSortDirection)
          );

    if (!selectsEnabled || pinnedSelectedIds.length === 0) {
      return ordered;
    }

    // Pinned "Your Selects" region: duplicated, marked clones of the selected images, prepended so
    // they sit at the top while the originals still render in place. The marker only affects the
    // React key (see Component.tsx) — layout treats them as normal image blocks. Pins inherit the
    // resolved ratings because they clone the already-processed output.
    const pinned = buildPinnedSelects(ordered, new Set(pinnedSelectedIds));
    return [...pinned, ...ordered];
  }, [
    filteredContent,
    overrides,
    drag,
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
      dateTwoState: isChronological,
      density: displayDensity,
      densityMax,
      onDensityChange: handleDensityChange,
    }),
    [
      filterState,
      availableOptions,
      filteredAvailableOptions,
      handleFilterChange,
      isChronological,
      displayDensity,
      densityMax,
      handleDensityChange,
    ]
  );

  const pageSize = collection.contentPerPage ?? 30;

  const hasOptions = hasFilterableOptions(baseCollectionOptions, showHighlyRated, showDateSort);

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
      serverContentWidth={serverContentWidth}
      serverViewportHeight={serverViewportHeight}
      serverIsMobile={serverIsMobile}
      selectedIds={isClientGallery ? selectedIds : undefined}
      onImageClick={isClientGallery && isSelectMode ? handleSelectToggle : undefined}
    />
  );

  const content = editMode ? (
    <>
      {!editLayerMounted && grid}
      <EditModeLayer
        collection={collection}
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

  // Provider nesting (outer→inner): Download → Selects → Rating → content. The rating provider
  // mounts only when the viewer may edit; otherwise the subtree is unchanged so the public render
  // is byte-identical.
  const withRating = canEdit ? (
    <RatingControlProvider value={ratingControlValue}>{content}</RatingControlProvider>
  ) : (
    content
  );

  const withSelects = selectsEnabled ? (
    <SelectsProvider
      collectionId={collection.id}
      initialSelectedIds={initialSelectedIds}
      onChange={setPinnedSelectedIds}
    >
      {withRating}
    </SelectsProvider>
  ) : (
    withRating
  );

  const maybeWrappedContent =
    isClientGallery && !editMode ? (
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
  return (
    <MeProvider me={me}>
      <CollectionFilterProvider value={hasOptions ? filterContextValue : null}>
        {maybeWrappedContent}
      </CollectionFilterProvider>
    </MeProvider>
  );
}
