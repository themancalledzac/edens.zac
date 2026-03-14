/**
 * Row Combination - Template Map Row Building
 *
 * Uses a (hCount, vCount) template map to determine layout structure for each row.
 * Greedy sequential fill determines which items go in each row; the template map
 * determines how those items are arranged (flat chain, DVP, nested quad, etc.).
 *
 * Key concepts:
 * - A "component" is anything that occupies row space: a single image, gif, text, or combined block.
 * - Component value = proportion of row width an item occupies (effectiveRating / rowWidth).
 * - A row is "complete" when total component values >= 0.9 (90% threshold).
 * - Templates are keyed by orientation counts and produce AtomicComponent trees.
 */

import type { AnyContentModel } from '@/app/types/Content';
import { getEffectiveRating, getItemComponentValue } from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

// =============================================================================
// TYPES
// =============================================================================

/** Recursive tree structure for rendering combinations */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };

// =============================================================================
// TEMPLATE KEY — structural identity for row compositions
// =============================================================================

/** Structural key for template map lookup: counts of H and V images in a row */
export interface TemplateKey {
  h: number;
  v: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate the total component value of a set of items.
 */
function getTotalCV(components: AnyContentModel[], rowWidth: number): number {
  return components.reduce((sum, item) => sum + getItemComponentValue(item, rowWidth), 0);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio — rows exceeding this are rejected to prevent item squeezing */
export const MAX_FILL_RATIO = 1.15;
/** Effective rating at or below which an item is considered low-rated for standalone skip */
export const LOW_RATED_THRESHOLD = 2;

/**
 * Check if a set of components fills a row within acceptable bounds.
 *
 * A row is "complete" when fill is between 90% and 115% of row width.
 *
 * @param components - Items to check
 * @param rowWidth - Row width budget (e.g., 5 for desktop)
 * @returns true if total component value is within 90-115% of row width
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce(
    (sum, item) => sum + getItemComponentValue(item, rowWidth),
    0
  );

  const fill = totalValue / rowWidth;
  return fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;
}

// =============================================================================
// ROW RESULT
// =============================================================================

/** A row result from the row-building algorithm */
export interface RowResult {
  components: AnyContentModel[];
  direction: 'horizontal' | 'vertical' | null;
  templateKey: TemplateKey;
  label: string;
  boxTree: BoxTree;
}

// =============================================================================
// ARCHITECTURE TYPES
// =============================================================================

/** Orientation shorthand for composition decisions */
export type OrientationShort = 'H' | 'V';

/** Thin view over AnyContentModel — pre-computed fields for composition */
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  effectiveRating: number;
  componentValue: number;
}

/** Recursive composition structure */
export type AtomicComponent =
  | { type: 'single'; img: ImageType }
  | {
      type: 'pair';
      direction: OrientationShort;
      children: [AtomicComponent, AtomicComponent];
    };

// =============================================================================
// ARCHITECTURE HELPERS
// =============================================================================

/** Convert AnyContentModel to ImageType for composition decisions */
export function toImageType(item: AnyContentModel, rowWidth: number): ImageType {
  const ar: OrientationShort = getAspectRatio(item) > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const componentValue = getItemComponentValue(item, rowWidth);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return { source: item, title, ar, effectiveRating, componentValue };
}

/** Create a single-image AtomicComponent */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair */
export function hPair(left: AtomicComponent, right: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack */
export function vStack(top: AtomicComponent, bottom: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'V', children: [top, bottom] };
}

/** Create a left-heavy horizontal chain from 2+ images */
export function hChain(images: ImageType[]): AtomicComponent {
  if (images.length === 0) {
    throw new Error('hChain requires at least 1 image');
  }
  if (images.length === 1) {
    return single(images[0]!);
  }

  let tree: AtomicComponent = hPair(single(images[0]!), single(images[1]!));
  for (let i = 2; i < images.length; i++) {
    tree = hPair(tree, single(images[i]!));
  }
  return tree;
}

/** Convert AtomicComponent tree to BoxTree for rendering */
export function acToBoxTree(ac: AtomicComponent): BoxTree {
  if (ac.type === 'single') {
    return { type: 'leaf', content: ac.img.source };
  }
  return {
    type: 'combined',
    direction: ac.direction === 'H' ? 'horizontal' : 'vertical',
    children: [acToBoxTree(ac.children[0]), acToBoxTree(ac.children[1])],
  };
}

/** Find the dominant image in a set (highest effective rating) */
export function findDominant(images: ImageType[]): { dominant: ImageType; rest: ImageType[] } {
  if (images.length === 0) {
    throw new Error('findDominant requires at least 1 image');
  }
  let dominantIdx = 0;
  for (let i = 1; i < images.length; i++) {
    if (images[i]!.effectiveRating > images[dominantIdx]!.effectiveRating) {
      dominantIdx = i;
    }
  }
  const dominant = images[dominantIdx]!;
  const rest = images.filter((_, i) => i !== dominantIdx);
  return { dominant, rest };
}

/** Generate the template map key for a set of images: "hCount-vCount" */
export function getTemplateKey(images: ImageType[]): string {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return `${h}-${v}`;
}

// =============================================================================
// buildAtomic — AR-target scoring for tree structure selection
// =============================================================================

/**
 * Generate candidate rest-group trees based on the number of rest images.
 * Each candidate represents a different spatial arrangement of the non-dominant images.
 */
function generateCandidates(rest: ImageType[]): AtomicComponent[] {
  const n = rest.length;

  if (n === 0) return [];

  if (n === 1) {
    return [single(rest[0]!)];
  }

  if (n === 2) {
    const [a, b] = [single(rest[0]!), single(rest[1]!)];
    // vStack first — wins ties per spec (prefer more vertical stacking)
    return [vStack(a, b), hPair(a, b)];
  }

  if (n === 3) {
    const [a, b, c] = [single(rest[0]!), single(rest[1]!), single(rest[2]!)];
    return [
      vStack(hPair(a, b), c),
      vStack(a, hPair(b, c)),
      hChain(rest),
    ];
  }

  // n === 4+
  const [a, b, c, d] = [single(rest[0]!), single(rest[1]!), single(rest[2]!), single(rest[3]!)];
  return [
    vStack(hPair(a, b), hPair(c, d)),
    vStack(hChain(rest.slice(0, 3)), single(rest[3]!)),
    hChain(rest),
  ];
}

/**
 * Build an AR-aware AtomicComponent tree from a set of images.
 *
 * For 3+ items, generates candidate tree structures and picks the one
 * whose combined AR is closest to targetAR. The dominant (highest-rated)
 * image gets full height on the right; candidates arrange the rest group.
 *
 * @param images - ImageType[] to arrange
 * @param targetAR - Target aspect ratio (typically 1.5 for most viewports)
 * @param rowWidth - Row width for AR calculation (chunkSize param)
 */
export function buildAtomic(images: ImageType[], targetAR: number, rowWidth: number): AtomicComponent {
  if (images.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (images.length === 1) return single(images[0]!);
  if (images.length === 2) return hPair(single(images[0]!), single(images[1]!));

  const { dominant, rest } = findDominant(images);
  const sorted = [...rest].sort((a, b) => a.effectiveRating - b.effectiveRating);
  const candidates = generateCandidates(sorted);

  let bestCandidate = candidates[0]!;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const finalTree = hPair(candidate, single(dominant));
    const ar = calculateBoxTreeAspectRatio(acToBoxTree(finalTree), rowWidth);
    const distance = Math.abs(ar - targetAR);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCandidate = candidate;
    }
  }

  return hPair(bestCandidate, single(dominant));
}

// =============================================================================
// compose — recursive composition dispatcher
// =============================================================================

/** Partition threshold — try partition splits at this group size and above */
const PARTITION_THRESHOLD = 5;

/**
 * Score a candidate AtomicComponent against a target AR.
 * Lower is better (distance from target).
 */
function scoreCandidate(candidate: AtomicComponent, targetAR: number, rowWidth: number): number {
  const ar = calculateBoxTreeAspectRatio(acToBoxTree(candidate), rowWidth);
  return Math.abs(ar - targetAR);
}

/**
 * Pick the best candidate from a list by AR distance to target.
 */
function pickBest(candidates: AtomicComponent[], targetAR: number, rowWidth: number): AtomicComponent {
  let best = candidates[0]!;
  let bestScore = Infinity;

  for (const c of candidates) {
    const score = scoreCandidate(c, targetAR, rowWidth);
    if (score < bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
}

/**
 * Generate partition split candidates for a group of images.
 * Tries balanced splits and scores each against targetAR.
 *
 * For n=5: tries (2,3) and (3,2)
 * For n=6: tries (2,4), (3,3), (4,2)
 * For n=7: tries (3,4), (4,3)
 * etc.
 */
function generatePartitionCandidates(
  images: ImageType[],
  targetAR: number,
  rowWidth: number,
  depth: number = 0
): AtomicComponent[] {
  const n = images.length;
  const candidates: AtomicComponent[] = [];

  // Determine split sizes to try
  const minSplit = 2;
  const maxSplit = n - 2; // At least 2 in each group

  // Sort strategies for assigning images to groups
  const sortStrategies: ImageType[][] = [
    // Strategy 1: sorted by rating (highest first)
    [...images].sort((a, b) => b.effectiveRating - a.effectiveRating),
    // Strategy 2: sorted by AR (verticals first, then horizontals)
    [...images].sort((a, b) => {
      if (a.ar !== b.ar) return a.ar === 'V' ? -1 : 1;
      return b.effectiveRating - a.effectiveRating;
    }),
  ];

  for (let leftSize = minSplit; leftSize <= maxSplit; leftSize++) {
    for (const sorted of sortStrategies) {
      const leftGroup = sorted.slice(0, leftSize);
      const rightGroup = sorted.slice(leftSize);

      // Recursively compose each side
      const left = compose(leftGroup, targetAR, rowWidth, depth);
      const right = compose(rightGroup, targetAR, rowWidth, depth);
      candidates.push(hPair(left, right));
    }
  }

  return candidates;
}

/** Maximum recursion depth for compose() to prevent stack overflow */
const MAX_COMPOSE_DEPTH = 10;

/**
 * Recursive composition dispatcher.
 *
 * Builds the best AtomicComponent tree for a set of images:
 * - n=1: single
 * - n=2: best of hPair/vStack by AR fit
 * - n=3-4: buildAtomic (1 dominant + rest candidates)
 * - n>=5: candidates from BOTH buildAtomic AND partition splits, pick best
 *
 * @param images - ImageType[] to arrange
 * @param targetAR - Target aspect ratio for the composition
 * @param rowWidth - Row width for AR calculation
 * @param depth - Current recursion depth (internal use only)
 */
export function compose(images: ImageType[], targetAR: number, rowWidth: number, depth: number = 0): AtomicComponent {
  const n = images.length;

  if (n === 0) throw new Error('compose requires at least 1 image');
  if (n === 1) return single(images[0]!);

  // Guard against unbounded recursion
  if (depth >= MAX_COMPOSE_DEPTH) {
    return hChain(images);
  }

  if (n === 2) {
    const [a, b] = [single(images[0]!), single(images[1]!)];
    const hCandidate = hPair(a, b);
    const vCandidate = vStack(a, b);
    return pickBest([hCandidate, vCandidate], targetAR, rowWidth);
  }

  if (n < PARTITION_THRESHOLD) {
    // n=3-4: use buildAtomic (1 dominant + rest)
    return buildAtomic(images, targetAR, rowWidth);
  }

  // n >= PARTITION_THRESHOLD: try dominant + rest AND partition splits, pick best
  const { dominant, rest } = findDominant(images);
  const restComposed = compose(rest, targetAR, rowWidth, depth + 1);

  const candidates: AtomicComponent[] = [
    hPair(restComposed, single(dominant)),
    ...generatePartitionCandidates(images, targetAR, rowWidth, depth + 1),
  ];

  return pickBest(candidates, targetAR, rowWidth);
}

// =============================================================================
// estimateRowAR — quick AR estimate for a set of images
// =============================================================================

/** AR floor multiplier: row AR must be at least targetAR * this value */
export const AR_FLOOR_MULTIPLIER = 0.7;

/** Maximum images per row (safety cap for AR-aware fill) */
export const MAX_ROW_IMAGES = 8;

/**
 * Estimate the combined aspect ratio of a set of images when composed together.
 * Uses compose() to build the tree, then calculates AR from the BoxTree.
 */
export function estimateRowAR(images: ImageType[], targetAR: number, rowWidth: number): number {
  const composition = compose(images, targetAR, rowWidth);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition), rowWidth);
}

// =============================================================================
// TEMPLATE MAP
// =============================================================================

/** A layout template that builds an AtomicComponent from a set of ImageTypes */
interface LayoutTemplate {
  label: string;
  build: (images: ImageType[], targetAR: number, rowWidth: number) => AtomicComponent;
}

/**
 * Build a dominant-stacked composition: H(dominant, V(rest[0], rest[1]))
 * Used when a high-rated horizontal image dominates 2 secondaries.
 * Falls back to flat hChain if no dominant H with effectiveRating >= 4.
 */
function buildDominantStacked(images: ImageType[], _targetAR: number, _rowWidth: number): AtomicComponent {
  const { dominant, rest } = findDominant(images);
  if (dominant.effectiveRating >= 4 && dominant.ar === 'H') {
    return hPair(single(dominant), vStack(single(rest[0]!), single(rest[1]!)));
  }
  return hChain(images);
}

/**
 * Build a nested-quad composition: H(main, V(H(topPair), bottom))
 * Used when 4 items have 3+ verticals — dominant vertical gets full height.
 * Falls back to flat hChain if < 3 verticals.
 */
function buildNestedQuad(images: ImageType[], _targetAR: number, _rowWidth: number): AtomicComponent {
  const verticals = images.filter(i => i.ar === 'V');
  if (verticals.length >= 3) {
    const sorted = [...verticals].sort((a, b) => b.effectiveRating - a.effectiveRating);
    const main = sorted[0]!;
    const rest = images.filter(i => i !== main);
    const restVerticals = rest
      .filter(i => i.ar === 'V')
      .sort((a, b) => a.effectiveRating - b.effectiveRating);
    const topPair = restVerticals.slice(0, 2);
    const bottom = rest.find(i => !topPair.includes(i))!;

    return hPair(
      single(main),
      vStack(hPair(single(topPair[0]!), single(topPair[1]!)), single(bottom))
    );
  }
  return hChain(images);
}

/** Static template map: (hCount, vCount) → layout builder */
export const TEMPLATE_MAP: Record<string, LayoutTemplate> = {
  // --- 1-item ---
  '1-0': { label: 'hero', build: imgs => single(imgs[0]!) },
  '0-1': { label: 'single-v', build: imgs => single(imgs[0]!) },

  // --- 2-item ---
  '2-0': {
    label: 'h-pair',
    build: imgs => hPair(single(imgs[0]!), single(imgs[1]!)),
  },
  '1-1': {
    label: 'dom-sec',
    build: imgs => hPair(single(imgs[0]!), single(imgs[1]!)),
  },
  '0-2': {
    label: 'v-pair',
    build: imgs => hPair(single(imgs[0]!), single(imgs[1]!)),
  },

  // --- 3-item: compose for general entries, dom-stacked for specific combos ---
  '3-0': { label: 'compose-3h', build: compose },
  '2-1': { label: 'dom-stacked-2h1v', build: buildDominantStacked },
  '1-2': { label: 'dom-stacked-1h2v', build: buildDominantStacked },
  '0-3': { label: 'compose-3v', build: compose },

  // --- 4-item: compose for general entries, nested-quad for vertical-heavy ---
  '4-0': { label: 'compose-4h', build: compose },
  '3-1': { label: 'compose-3h1v', build: compose },
  '2-2': { label: 'compose-2h2v', build: compose },
  '1-3': { label: 'nested-quad-1h3v', build: buildNestedQuad },
  '0-4': { label: 'nested-quad-0h4v', build: buildNestedQuad },

  // --- 5-item: compose handles all ---
  '5-0': { label: 'compose-5h', build: compose },
  '4-1': { label: 'compose-4h1v', build: compose },
  '3-2': { label: 'compose-3h2v', build: compose },
  '2-3': { label: 'compose-2h3v', build: compose },
  '1-4': { label: 'compose-1h4v', build: compose },
  '0-5': { label: 'compose-5v', build: compose },
};

// =============================================================================
// COMPOSITION LOOKUP
// =============================================================================

/** Result of a template map lookup */
export interface CompositionResult {
  composition: AtomicComponent;
  templateKey: TemplateKey;
  label: string;
}

/**
 * Look up and build a composition for a set of images using the template map.
 *
 * @param images - ImageType[] assigned to this row (already determined by greedy fill)
 * @param targetAR - Target aspect ratio for AR-aware templates (default 1.5)
 * @param rowWidth - Row width budget for AR calculation
 * @returns CompositionResult with AtomicComponent tree, structural key, and template label
 */
export function lookupComposition(images: ImageType[], targetAR: number = 1.5, rowWidth: number = 5): CompositionResult {
  const templateKey = parseTemplateKey(images);
  const key = `${templateKey.h}-${templateKey.v}`;
  const template = TEMPLATE_MAP[key];

  if (!template) {
    // 6+ images have no static template — use compose() for recursive composition
    return { composition: compose(images, targetAR, rowWidth), templateKey, label: 'compose-fallback' };
  }

  return { composition: template.build(images, targetAR, rowWidth), templateKey, label: template.label };
}

/** Build a TemplateKey from a set of images by counting h/v directly */
function parseTemplateKey(images: ImageType[]): TemplateKey {
  let h = 0;
  let v = 0;
  for (const img of images) {
    if (img.ar === 'H') h++;
    else v++;
  }
  return { h, v };
}

// =============================================================================
// buildRows
// =============================================================================

/** Collect non-skipped items from a window for row building */
function collectRowItems(
  window: AnyContentModel[],
  count: number,
  skippedStandalones: number[]
): AnyContentModel[] {
  const items: AnyContentModel[] = [];
  let taken = 0;
  for (let i = 0; i < window.length && taken < count; i++) {
    if (!skippedStandalones.includes(i)) {
      items.push(window[i]!);
      taken++;
    }
  }
  return items;
}

/** Derive direction from AtomicComponent root for RowResult */
export function deriveDirection(ac: AtomicComponent): 'horizontal' | 'vertical' | null {
  if (ac.type === 'single') return null;
  return ac.direction === 'H' ? 'horizontal' : 'vertical';
}

/**
 * Row-first layout algorithm.
 *
 * Builds rows one at a time using a working window (lookahead of 5 items).
 * For each row:
 * 1. Check for STANDALONE skip (hero image past low-rated items)
 * 2. Greedy sequential fill until row is complete or overshoots
 * 3. Best-fit fallback when sequential fill fails
 * 4. Template map lookup for layout structure
 *
 * @param items - All content items to layout
 * @param rowWidth - Row width budget (5 for desktop, 4 for tablet, etc.)
 * @returns Array of rows, each with components and their combination direction
 */
export function buildRows(items: AnyContentModel[], rowWidth: number, targetAR: number = 1.5): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

    // --- STANDALONE skip check ---
    // If item 0 is low-rated (effectiveRating ≤ 2), search ahead for a hero
    // that fills the row solo.
    const item0Rating = getEffectiveRating(window[0]!);

    if (item0Rating <= LOW_RATED_THRESHOLD) {
      const maxSearch = Math.min(3, window.length);
      let heroIdx = -1;

      for (let i = 1; i < maxSearch; i++) {
        const candidate = window[i]!;
        const cv = getItemComponentValue(candidate, rowWidth);
        if (cv / rowWidth >= MIN_FILL_RATIO) {
          heroIdx = i;
          break;
        }
      }

      if (heroIdx >= 0) {
        const heroItem = window[heroIdx]!;
        const heroImg = toImageType(heroItem, rowWidth);
        const composition = single(heroImg);
        const boxTree = acToBoxTree(composition);

        const heroKey = parseTemplateKey([heroImg]);
        rows.push({
          components: [heroItem],
          direction: null,
          templateKey: heroKey,
          label: 'hero',
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    // --- Greedy sequential fill ---
    // Standalone promotion: if the next item would overfill AND it fills a row
    // on its own (cv >= rowWidth * MIN_FILL_RATIO), skip it. The standalone will
    // get its own row on a subsequent iteration. This replaces the old
    // reorderLonelyVerticals pre-pass.
    // On mobile (rowWidth ≤ 2), disable AR-floor check entirely.
    // Mobile renders items full-width or stacked, so single vertical images
    // naturally have low AR. Without this, the AR override pulls 3-4+ items
    // into a single row, creating tiny cramped images.
    const arFloor = rowWidth <= 2 ? 0 : targetAR * AR_FLOOR_MULTIPLIER;
    // Expand window to MAX_ROW_IMAGES for AR-aware fill (may pull more items)
    const expandedWindow = remaining.slice(0, MAX_ROW_IMAGES);
    let seqTotal = 0;
    let seqCount = 0;
    let seqFailed = false;
    const skippedStandalones: number[] = [];
    let slotCountComplete = false;

    for (let i = 0; i < expandedWindow.length; i++) {
      const cv = getItemComponentValue(expandedWindow[i]!, rowWidth);
      const newFill = (seqTotal + cv) / rowWidth;

      if (newFill > MAX_FILL_RATIO && !slotCountComplete) {
        // If we already have items AND this item is a standalone, skip it
        if (seqCount > 0 && cv / rowWidth >= MIN_FILL_RATIO) {
          skippedStandalones.push(i);
          continue;
        }
        seqFailed = seqTotal / rowWidth < MIN_FILL_RATIO;
        break;
      }

      // If we've already hit slot-count fill, only add if AR-aware fill demands it
      if (slotCountComplete) {
        // Beyond the original window — always add (we're here because AR was too low)
        seqTotal += cv;
        seqCount += 1;

        // Re-check AR with the expanded set
        const expandedItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const expandedImgs = expandedItems.map(item => toImageType(item, rowWidth));
        const expandedAR = estimateRowAR(expandedImgs, targetAR, rowWidth);
        if (expandedAR >= arFloor) break;
        continue;
      }

      seqTotal += cv;
      seqCount += 1;

      if (newFill >= MIN_FILL_RATIO) {
        // Row is complete by slot count — check AR before closing
        const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
        const rowAR = estimateRowAR(rowImgs, targetAR, rowWidth);

        if (rowAR >= arFloor) {
          break; // AR is acceptable, close the row
        }
        // AR too low — mark slot-count complete but keep filling
        slotCountComplete = true;
      }
    }

    if (!seqFailed && seqCount > 0) {
      const rowItems = collectRowItems(expandedWindow, seqCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item, rowWidth));
      const { composition, templateKey, label } = lookupComposition(rowImgs, targetAR, rowWidth);
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        direction: deriveDirection(composition),
        templateKey,
        label,
        boxTree,
      });

      // Remove used items from remaining (skip standalone indices stay)
      const usedIndices = new Set<number>();
      let t = 0;
      for (let i = 0; i < expandedWindow.length && t < seqCount; i++) {
        if (!skippedStandalones.includes(i)) {
          usedIndices.add(i);
          t++;
        }
      }
      // Remove from highest index first to preserve lower indices
      const sortedUsed = [...usedIndices].sort((a, b) => b - a);
      for (const idx of sortedUsed) {
        remaining.splice(idx, 1);
      }
      continue;
    }

    // --- Best-fit fallback ---
    const bfComponents: AnyContentModel[] = [];
    const bfUsedIndices: number[] = [];
    const available = new Set(window.map((_, i) => i));

    bfComponents.push(window[0]!);
    bfUsedIndices.push(0);
    available.delete(0);

    if (!isRowComplete(bfComponents, rowWidth)) {
      while (available.size > 0) {
        const currentTotal = getTotalCV(bfComponents, rowWidth);
        const gap = rowWidth - currentTotal;

        let bestIndex = -1;
        let bestDistance = Infinity;

        for (const idx of available) {
          const item = window[idx];
          if (!item) continue;
          const cv = getItemComponentValue(item, rowWidth);
          const distance = Math.abs(cv - gap);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = idx;
          }
        }

        if (bestIndex === -1) break;

        const candidateCV = getItemComponentValue(window[bestIndex]!, rowWidth);
        const newTotal = currentTotal + candidateCV;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (currentFill >= MIN_FILL_RATIO || underfillDistance <= overfillDistance) {
            break;
          }
          bfComponents.push(window[bestIndex]!);
          bfUsedIndices.push(bestIndex);
          break;
        }

        bfComponents.push(window[bestIndex]!);
        bfUsedIndices.push(bestIndex);
        available.delete(bestIndex);

        if (isRowComplete(bfComponents, rowWidth)) {
          break;
        }
      }
    }

    const bfImgs = bfComponents.map(item => toImageType(item, rowWidth));
    const { composition, templateKey: bfKey, label: bfLabel } = lookupComposition(bfImgs, targetAR, rowWidth);
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bfComponents,
      direction: deriveDirection(composition),
      templateKey: bfKey,
      label: bfLabel,
      boxTree,
    });

    const sortedIndices = [...bfUsedIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      remaining.splice(idx, 1);
    }
  }

  return rows;
}
