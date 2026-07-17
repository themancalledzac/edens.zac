/**
 * Pure helpers for the content {@link Component} — viewport reconciliation, row building, and
 * BoxTree fallback. Kept out of the component so the JSX stays thin and the logic is unit-testable.
 */

import { shouldUseMeasuredWidth } from '@/app/constants';
import { type ViewportDimensions } from '@/app/hooks/useViewport';
import { type CollectionModel } from '@/app/types/Collection';
import { type AnyContentModel } from '@/app/types/Content';
import {
  type CalculatedContentSize,
  isContentVisibleInCollection,
  processContentForDisplay,
  type RowWithPatternAndSizes,
} from '@/app/utils/contentLayout';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import { logger } from '@/app/utils/logger';
import { type BoxTree } from '@/app/utils/rowCombination';

/** SSR fallback viewport, used until the client has measured. */
export interface ServerViewport {
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}

/** The viewport actually used to lay out content (client-measured, or the SSR fallback). */
export interface EffectiveViewport {
  contentWidth: number;
  viewportHeight: number;
  isMobile: boolean;
}

/**
 * Choose the viewport to lay out with: the client-measured one once it's the better fit, otherwise
 * the SSR fallback (which avoids a hydration reflow while still fitting the viewport).
 */
export function resolveEffectiveViewport(
  measured: ViewportDimensions,
  server: ServerViewport,
  tolerance: number
): EffectiveViewport {
  // The tolerance keeps the SSR width across hydration to avoid a reflow. On desktop the SSR
  // width is capped at pageMaxWidth, so it matches most real viewports exactly and keeping it is
  // free. Mobile has no width cap, so a real device wider than the SSR fallback (e.g. a 430px
  // phone vs the 390px default) would stay short of full-bleed. On mobile we therefore drop the
  // tolerance and always adopt the measured width.
  const effectiveTolerance = measured.isMobile ? 0 : tolerance;
  const useMeasured = shouldUseMeasuredWidth(
    measured.contentWidth,
    server.serverContentWidth,
    effectiveTolerance
  );
  return {
    contentWidth: useMeasured
      ? measured.contentWidth
      : (server.serverContentWidth ?? measured.contentWidth),
    viewportHeight: useMeasured
      ? measured.viewportHeight
      : (server.serverViewportHeight ?? measured.viewportHeight),
    isMobile: useMeasured ? measured.isMobile : (server.serverIsMobile ?? measured.isMobile),
  };
}

/** Target row aspect ratio ≈ screen AR (so each row ≈ one screenful), clamped to [1.0, 2.5]. */
export function computeTargetAspectRatio(contentWidth: number, viewportHeight: number): number {
  return viewportHeight > 0 ? Math.max(1.0, Math.min(2.5, contentWidth / viewportHeight)) : 1.5;
}

/**
 * Lay out the rows for the given viewport. Returns empty rows (no error) before there's a width or
 * any content, and captures a layout failure as `layoutError` rather than throwing.
 */
export function buildContentRows(
  content: AnyContentModel[] | undefined,
  collectionData: CollectionModel | undefined,
  viewport: EffectiveViewport,
  chunkSize: number,
  mobileChunkSize?: number
): { rows: RowWithPatternAndSizes[]; layoutError: string | null } {
  if (!viewport.contentWidth) return { rows: [], layoutError: null };
  if ((!content || content.length === 0) && !collectionData) return { rows: [], layoutError: null };

  const targetAR = computeTargetAspectRatio(viewport.contentWidth, viewport.viewportHeight);
  try {
    const rows = processContentForDisplay(content || [], viewport.contentWidth, chunkSize, {
      isMobile: viewport.isMobile,
      collectionData,
      displayMode: collectionData?.displayMode,
      targetAR,
      mobileChunkSize,
    });
    return { rows, layoutError: null };
  } catch (error) {
    logger.error('Component', 'processContentForDisplay error', error);
    return {
      rows: [],
      layoutError: error instanceof Error ? error.message : 'Unknown layout error',
    };
  }
}

/**
 * Index of the first row containing content hidden in the current collection (drives the
 * "Non-Visible Content" separator). Returns -1 when there's no such row, or when the only hidden
 * content sits in row 0 with no visible content alongside it.
 *
 * Both checks below exclude {@link isBlankContent} items: a BLANK is a synthetic spacer the layout
 * engine pads under-filled rows with (see `padRowToWidth` in `rowCombination.ts`), never real
 * content, and must never itself count as "visible" or "hidden" content for this decision. It sets
 * `visible: true` for an unrelated reason (so it doesn't trip `hasNonVisible` on its own), and that
 * field alone isn't a signal this function should read as "there is visible content here" — hence
 * the explicit filter rather than relying on the blank's `visible` value by coincidence.
 */
export function computeFirstNonVisibleRowIndex(
  rows: RowWithPatternAndSizes[],
  currentCollectionId?: number
): number {
  if (!currentCollectionId || rows.length === 0) return -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const hasNonVisible = row.items.some(
      item =>
        !isBlankContent(item.content) &&
        !isContentVisibleInCollection(item.content, currentCollectionId)
    );

    if (hasNonVisible) {
      if (i > 0) return i;
      const hasVisible = row.items.some(
        item =>
          !isBlankContent(item.content) &&
          isContentVisibleInCollection(item.content, currentCollectionId)
      );
      return hasVisible ? i : -1;
    }
  }

  return -1;
}

/**
 * Drop IMAGE content whose id is in `failedIds`.
 *
 * A runtime image-load failure (a valid-looking URL that 404s) can only be detected client-side,
 * after the BoxTree has already allocated the image's slot and fixed the row height. Rendering the
 * failed image as nothing then leaves its slot as a blank void. On the public view we instead
 * remove the block here and let the layout reflow, so the surviving images redistribute. Only
 * IMAGE blocks are eligible — a TEXT/COLLECTION block sharing an id is never removed. Returns the
 * same array reference when nothing is filtered, so the layout memo stays stable.
 */
export function excludeFailedImages(
  content: AnyContentModel[],
  failedIds: ReadonlySet<number>
): AnyContentModel[] {
  if (failedIds.size === 0) return content;
  const filtered = content.filter(
    block => !(block.contentType === 'IMAGE' && failedIds.has(block.id))
  );
  return filtered.length === content.length ? content : filtered;
}

/** Build a simple left-associative horizontal BoxTree from a flat list of items. */
export function createSimpleBoxTree(items: CalculatedContentSize[]): BoxTree {
  const contents = items.map(item => item.content);

  if (contents.length === 1) {
    return { type: 'leaf' as const, content: contents[0]! };
  }

  if (contents.length === 2) {
    return {
      type: 'combined' as const,
      direction: 'horizontal' as const,
      children: [
        { type: 'leaf' as const, content: contents[0]! },
        { type: 'leaf' as const, content: contents[1]! },
      ],
    };
  }

  // For 3+ items: build a left-associative tree.
  let tree: BoxTree = {
    type: 'combined',
    direction: 'horizontal',
    children: [
      { type: 'leaf', content: contents[0]! },
      { type: 'leaf', content: contents[1]! },
    ],
  };

  for (let i = 2; i < contents.length; i++) {
    tree = {
      type: 'combined',
      direction: 'horizontal',
      children: [tree, { type: 'leaf', content: contents[i]! }],
    };
  }

  return tree;
}
