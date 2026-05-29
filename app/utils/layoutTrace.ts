/**
 * Layout trace — single page-wide diagnostic object for composeV2 A/B work.
 *
 * Emits one structured object per `processContentForDisplay` call when the
 * `?layout=v2` URL flag is active. Gives a data-driven view of original input
 * order, final row composition, and per-row metrics (tree shape, fill, AR,
 * vTier, prominence, swap displacement). Replaces the prior per-row
 * `[ROW-TRACE]` console spam with a single inspectable object.
 *
 * Why per-row swap displacement: composeV2 caps leaf displacement at ±1 (spec
 * P6). The trace records each leaf's `treePosition - withinRowInputIdx`, so
 * any value > 1 indicates either a singleton-only-swap rule regression OR
 * downstream `reorderWithinRows` reshuffling beyond V2's intent.
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getEffectiveRating, getItemComponentValue } from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
import { type BoxTree, type LayoutVersion, type TemplateKey } from '@/app/utils/rowCombination';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

/** Round helper — keep the trace numbers readable in DevTools. */
function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Extract rating field (0-5) without leaning on a discriminated union. */
function ratingOf(item: AnyContentModel): number {
  const r = (item as { rating?: number | null }).rating;
  return typeof r === 'number' ? r : 0;
}

/** Build a compact shape string: `h(L1,v(L2,L3))`. */
export function treeShape(tree: BoxTree): string {
  if (tree.type === 'leaf') {
    const id = (tree.content as { id?: number | string }).id;
    return `L${id ?? '?'}`;
  }
  const dir = tree.direction === 'horizontal' ? 'h' : 'v';
  return `${dir}(${treeShape(tree.children[0])},${treeShape(tree.children[1])})`;
}

/** In-order leaf traversal (left-to-right). */
export function walkLeaves(tree: BoxTree): AnyContentModel[] {
  if (tree.type === 'leaf') return [tree.content];
  return [...walkLeaves(tree.children[0]), ...walkLeaves(tree.children[1])];
}

/**
 * Max vertical tiers in the subtree. Leaf=1, hPair=max(children), vStack=sum.
 * composeV2 caps this at 2 — values > 2 indicate a V1 row or a regression.
 */
export function vTierOfTree(tree: BoxTree): number {
  if (tree.type === 'leaf') return 1;
  const left = vTierOfTree(tree.children[0]);
  const right = vTierOfTree(tree.children[1]);
  return tree.direction === 'vertical' ? left + right : Math.max(left, right);
}

export interface LayoutTraceItem {
  idx: number;
  id: number | string | undefined;
  contentType: string;
  rating: number;
  effRating: number;
  ar: number;
  orient: 'H' | 'V';
  cv: number;
}

export interface LayoutTraceRowItem {
  id: number | string | undefined;
  originalIdx: number;
  treePosition: number;
  withinRowInputIdx: number;
  displacement: number;
  rating: number;
  effRating: number;
  ar: number;
  orient: 'H' | 'V';
  cv: number;
}

export interface LayoutTraceRow {
  rowIdx: number;
  isLastRow: boolean;
  templateKey: string;
  itemCount: number;
  treeShape: string;
  leafOrder: Array<number | string | undefined>;
  items: LayoutTraceRowItem[];
  sumCv: number;
  fillRatio: number;
  rowAR: number;
  targetAR: number;
  arVsTarget: number;
  vTier: number;
  maxEffRating: number;
  swapBudget: {
    maxDisplacement: number;
    totalDisplacement: number;
  };
}

export interface LayoutTrace {
  timestamp: string;
  page: {
    componentWidth: number;
    rowWidth: number;
    targetAR: number;
    layoutVersion: LayoutVersion;
    isMobile: boolean;
    totalItems: number;
    totalRows: number;
  };
  originalOrder: LayoutTraceItem[];
  rows: LayoutTraceRow[];
}

interface RowLike {
  templateKey: TemplateKey | 'standard' | 'header';
  items: Array<{ content: AnyContentModel }>;
  boxTree: BoxTree;
}

export interface BuildLayoutTraceOptions {
  content: AnyContentModel[];
  rows: RowLike[];
  componentWidth: number;
  rowWidth: number;
  targetAR: number;
  layoutVersion: LayoutVersion;
  isMobile: boolean;
}

/** Stable lookup key for an AnyContentModel — used to map row items to original input idx. */
function keyOf(item: AnyContentModel): string {
  const id = (item as { id?: number | string }).id;
  const orderIndex = (item as { orderIndex?: number }).orderIndex;
  return `${item.contentType}|${id ?? ''}|${orderIndex ?? ''}`;
}

function templateKeyToString(key: TemplateKey | 'standard' | 'header'): string {
  if (typeof key === 'string') return key;
  return `${key.h}h-${key.v}v`;
}

export function buildLayoutTrace(opts: BuildLayoutTraceOptions): LayoutTrace {
  const { content, rows, componentWidth, rowWidth, targetAR, layoutVersion, isMobile } = opts;

  const originalOrder: LayoutTraceItem[] = content.map((item, idx) => {
    const ar = getAspectRatio(item);
    return {
      idx,
      id: (item as { id?: number | string }).id,
      contentType: item.contentType,
      rating: ratingOf(item),
      effRating: getEffectiveRating(item),
      ar: r3(ar),
      orient: ar > 1 ? 'H' : 'V',
      cv: r3(getItemComponentValue(item)),
    };
  });

  const originalIdxByKey = new Map<string, number>();
  for (const [idx, item] of content.entries()) originalIdxByKey.set(keyOf(item), idx);

  const contentRows = rows.filter(row => row.templateKey !== 'header');

  const traceRows: LayoutTraceRow[] = contentRows.map((row, rowIdx) => {
    const leaves = walkLeaves(row.boxTree);

    // Within-row "input order": items sorted by original input idx among this row's items.
    // Captures swap displacement even after rowOptimizer reshuffles inside a row.
    const rowEntries = row.items.map(it => ({
      content: it.content,
      originalIdx: originalIdxByKey.get(keyOf(it.content)) ?? -1,
    }));
    const sortedByOriginal = [...rowEntries].sort((a, b) => a.originalIdx - b.originalIdx);
    const withinRowInputIdxByKey = new Map<string, number>();
    for (const [withinIdx, entry] of sortedByOriginal.entries()) {
      withinRowInputIdxByKey.set(keyOf(entry.content), withinIdx);
    }

    let sumCv = 0;
    let maxEffRating = 0;
    let totalDisplacement = 0;
    let maxDisplacement = 0;

    const items: LayoutTraceRowItem[] = leaves.map((leaf, treePosition) => {
      const k = keyOf(leaf);
      const originalIdx = originalIdxByKey.get(k) ?? -1;
      const withinRowInputIdx = withinRowInputIdxByKey.get(k) ?? -1;
      const displacement = Math.abs(treePosition - withinRowInputIdx);
      totalDisplacement += displacement;
      if (displacement > maxDisplacement) maxDisplacement = displacement;

      const cv = getItemComponentValue(leaf);
      const effRating = getEffectiveRating(leaf);
      sumCv += cv;
      if (effRating > maxEffRating) maxEffRating = effRating;

      const ar = getAspectRatio(leaf);
      return {
        id: (leaf as { id?: number | string }).id,
        originalIdx,
        treePosition,
        withinRowInputIdx,
        displacement,
        rating: ratingOf(leaf),
        effRating,
        ar: r3(ar),
        orient: ar > 1 ? 'H' : 'V',
        cv: r3(cv),
      };
    });

    const rowAR = r3(calculateBoxTreeAspectRatio(row.boxTree, rowWidth));

    return {
      rowIdx,
      isLastRow: rowIdx === contentRows.length - 1,
      templateKey: templateKeyToString(row.templateKey),
      itemCount: items.length,
      treeShape: treeShape(row.boxTree),
      leafOrder: items.map(it => it.id),
      items,
      sumCv: r3(sumCv),
      fillRatio: rowWidth > 0 ? r3(sumCv / rowWidth) : 0,
      rowAR,
      targetAR: r3(targetAR),
      arVsTarget: r3(rowAR - targetAR),
      vTier: vTierOfTree(row.boxTree),
      maxEffRating,
      swapBudget: { maxDisplacement, totalDisplacement },
    };
  });

  return {
    timestamp: new Date().toISOString(),
    page: {
      componentWidth,
      rowWidth,
      targetAR: r3(targetAR),
      layoutVersion,
      isMobile,
      totalItems: content.length,
      totalRows: traceRows.length,
    },
    originalOrder,
    rows: traceRows,
  };
}

/**
 * Emit the trace to the browser console + stash on `window.__layoutTrace` for
 * DevTools inspection. SSR no-op. Gated by the caller (typically `useV2`).
 */
export function logLayoutTrace(trace: LayoutTrace): void {
  if (typeof window === 'undefined') return;

  console.log('[LAYOUT-TRACE]', trace);
  (window as unknown as { __layoutTrace?: LayoutTrace }).__layoutTrace = trace;
}
