'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { useMe } from '@/app/components/auth/MeProvider';
import { LAYOUT } from '@/app/constants';
import { useViewport } from '@/app/hooks/useViewport';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel, type ViewableContent } from '@/app/types/Content';
import { type MaybePinned, PINNED_SELECT } from '@/app/types/Selects';
import { type RowWithPatternAndSizes } from '@/app/utils/contentLayout';
import { canDownloadCollection } from '@/app/utils/galleryAccess';
import { describeLayoutRows } from '@/app/utils/layoutDebug';
import { logger } from '@/app/utils/logger';

import { BoxRenderer } from './BoxRenderer';
import {
  buildContentRows,
  computeFirstNonVisibleRowIndex,
  computePriorityRowIndex,
  createSimpleBoxTree,
  excludeFailedImages,
  resolveEffectiveViewport,
} from './componentUtils';
import cbStyles from './ContentComponent.module.scss';
import {
  type RendererContextValue,
  RendererProvider,
  type SharedRendererProps,
  useRenderer,
} from './RendererContext';

export interface ContentComponentProps extends SharedRendererProps {
  content: AnyContentModel[];
  /**
   * Fallback priority row when the layout is header-only. Normally the layout auto-extends eager
   * loading through the first content row (see {@link computePriorityRowIndex}), so the true LCP
   * grid image — not just the height-constrained cover — loads eagerly.
   */
  priorityIndex?: number;
  /** Accepts any viewable content (image, parallax image, or GIF/MP4 — normalized in renderer) */
  onFullScreenImageClick?: (image: ViewableContent) => void;
  /** Number of images per row (default: 2) */
  chunkSize?: number;
  /**
   * Mobile-scale density (1-5) driving the row-width budget on mobile. Forwarded
   * to the layout so the collection page's density slider takes effect on touch
   * viewports; omit it to keep the default narrow mobile layout.
   */
  mobileChunkSize?: number;
  /** Collection model for creating header row (cover image + metadata) */
  collectionData?: CollectionModel;
  /**
   * Build the header's metadata rail even with no metadata text, because this page mounts the
   * filter toolbar and/or the download row into it. See `ProcessContentOptions.forceHeaderRail`.
   */
  forceHeaderRail?: boolean;
  /**
   * Mean width-cost of the collection's UNFILTERED content, so an active filter does not resize
   * every photo. See `ProcessContentOptions.widthCostBaseline`.
   */
  widthCostBaseline?: number;
  /** SSR fallback viewport. Used when `useViewport()` hasn't measured yet. */
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}

/**
 * Per-item fragment of a row's React key. Pinned "Your Selects" clones share their original's
 * `id`, so the marker is folded into the key to keep prepended clones distinct from the in-place
 * originals — otherwise the duplicated id would collide. Layout is unaffected; only the key differs.
 */
function itemKeyFragment(content: AnyContentModel): string {
  const pinnedPrefix = (content as MaybePinned<AnyContentModel>)[PINNED_SELECT] ? 'pinned-' : '';
  return `${pinnedPrefix}${content.contentType}-${content.id ?? content.orderIndex}`;
}

/**
 * Development-only layout log: one structural line per packed row (span×height, right-edge gap,
 * internal pocket, tree, leaf sizes) on every re-pack. The console is the fastest shared view of
 * what the packer decided — the same measurements the collapse-state tests assert on.
 *
 * With one thing to know before you go looking for it: {@link logger}'s `debug` calls
 * `console.debug`, which DevTools files under the **Verbose** level, and Verbose is OFF under the
 * default log-level filter. The lines are there; the console has to be asked for them. That is the
 * cost of the routing below, and it is worth paying — but "open the console and collapse a panel"
 * is not on its own sufficient instructions for anyone reproducing a layout report.
 *
 * It goes out through {@link logger}, which is what keeps it out of Jest: the logger returns early
 * at `NODE_ENV === 'test'`, while the `production` check here is this diagnostic's own. A direct
 * `console.info` satisfied only the second, so every suite that packs a layout printed a line per
 * row per re-pack over the test output — and it was the last `console.*` call left outside
 * `logger.ts` after the #171 migration.
 *
 * A hook rather than an inline effect so the reasoning above can live in a docblock; the project
 * keeps prose out of component bodies.
 */
function useLayoutRowLog(rows: RowWithPatternAndSizes[], contentWidth: number): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    for (const line of describeLayoutRows(rows, contentWidth)) {
      logger.debug('layout', line);
    }
  }, [rows, contentWidth]);
}

/**
 * Content  Component
 *
 * High-performance content rendering system that processes and displays
 * mixed content (images, text, etc.) in optimized responsive layouts.
 * Features memoized calculations, responsive chunking, and type-safe specialized renderers.
 */
export default function Component({
  content,
  priorityIndex = 0,
  onFullScreenImageClick,
  chunkSize = LAYOUT.defaultChunkSize,
  mobileChunkSize,
  collectionData,
  forceHeaderRail = false,
  widthCostBaseline,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
  ...shared
}: ContentComponentProps) {
  // `EditModeLayer` provides the edit slice above this component; every public caller renders
  // without a provider, where this is the frozen empty value.
  const edit = useRenderer();
  const { currentCollectionId } = edit;

  const measured = useViewport();

  // Download UI is a capability gate (backend authorizes by CLIENT role on any collection), not a
  // collection-type gate. `useMe()` degrades to null outside a MeProvider → type-only behavior.
  const canDownload = canDownloadCollection(useMe(), collectionData);

  const viewport = useMemo(
    () =>
      resolveEffectiveViewport(
        measured,
        { serverContentWidth, serverViewportHeight, serverIsMobile },
        LAYOUT.ssrRecomputeToleranceWidth
      ),
    [measured, serverContentWidth, serverViewportHeight, serverIsMobile]
  );

  // Images whose URL 404s only fail at load time, after the BoxTree slot is allocated. On the
  // public view we drop the failed image and let the row reflow rather than leaving its slot as a
  // blank void; manage (currentCollectionId set) keeps it so an admin can open + delete it.
  const isPublicView = currentCollectionId == null;
  const [failedImageIds, setFailedImageIds] = useState<ReadonlySet<number>>(() => new Set());

  const handleImageLoadError = useCallback((contentId: number) => {
    setFailedImageIds(prev => (prev.has(contentId) ? prev : new Set(prev).add(contentId)));
  }, []);

  const rendererValue: RendererContextValue = {
    ...edit,
    ...shared,
    onImageLoadError: handleImageLoadError,
    onFullScreenImageClick,
    canDownload,
    collectionSlug: collectionData?.slug,
  };

  // Note: a failed id is not cleared if `content` is later refetched with a fixed URL — the image
  // stays hidden until this Component remounts (e.g. navigation). Keying a reset on the `content`
  // reference would risk a render loop if the parent passes a fresh array each render.
  const displayContent = useMemo(
    () => (isPublicView ? excludeFailedImages(content, failedImageIds) : content),
    [isPublicView, content, failedImageIds]
  );

  const { rows, layoutError } = useMemo(
    () =>
      buildContentRows(
        displayContent,
        collectionData,
        viewport,
        chunkSize,
        mobileChunkSize,
        forceHeaderRail,
        widthCostBaseline
      ),
    [
      displayContent,
      collectionData,
      viewport,
      chunkSize,
      mobileChunkSize,
      forceHeaderRail,
      widthCostBaseline,
    ]
  );

  useLayoutRowLog(rows, viewport.contentWidth);

  // Must be computed before the early returns to satisfy the Rules of Hooks.
  const firstNonVisibleRowIndex = useMemo(
    () => computeFirstNonVisibleRowIndex(rows, currentCollectionId),
    [rows, currentCollectionId]
  );

  const priorityRowIndex = useMemo(
    () => computePriorityRowIndex(rows, priorityIndex),
    [rows, priorityIndex]
  );

  if (layoutError) {
    return (
      <div className={cbStyles.wrapper}>
        <div className={cbStyles.layoutError}>Failed to render content layout: {layoutError}</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className={cbStyles.wrapper}>
        <div className={cbStyles.layoutSkeleton} aria-hidden="true" data-testid="layout-skeleton" />
      </div>
    );
  }

  /** Renders a row using BoxRenderer (recursive). */
  const renderRow = (row: RowWithPatternAndSizes, rowIndex: number) => {
    const { rowType, items, boxTree } = row;
    const rowKey = `row-${rowIndex}-${items.map(i => itemKeyFragment(i.content)).join('-')}`;

    // If boxTree is missing (shouldn't happen), create a fallback
    const tree = boxTree || createSimpleBoxTree(items);

    const sizesMap = new Map(
      items.map(item => [item.content.id, { width: item.width, height: item.height }])
    );

    const dataPattern = rowType;

    return (
      <div key={rowKey} className={cbStyles.row} data-pattern={dataPattern}>
        <BoxRenderer
          tree={tree}
          sizes={sizesMap}
          isMobile={viewport.isMobile}
          priority={rowIndex <= priorityRowIndex}
        />
      </div>
    );
  };

  return (
    <RendererProvider value={rendererValue}>
      <div className={cbStyles.wrapper}>
        <div className={cbStyles.inner}>
          {rows.map((row, rowIndex) => {
            const shouldShowSeparator =
              firstNonVisibleRowIndex !== -1 && rowIndex === firstNonVisibleRowIndex;
            const rowKey = `row-${rowIndex}-${row.items.map(i => itemKeyFragment(i.content)).join('-')}`;

            return (
              <Fragment key={rowKey}>
                {shouldShowSeparator && (
                  <div className={cbStyles.visibilitySeparator}>
                    <div className={cbStyles.separatorLine} />
                    <div className={cbStyles.separatorLabel}>Non-Visible Content</div>
                    <div className={cbStyles.separatorLine} />
                  </div>
                )}
                {renderRow(row, rowIndex)}
              </Fragment>
            );
          })}
        </div>
      </div>
    </RendererProvider>
  );
}
