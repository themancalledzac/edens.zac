/**
 * Row layout engine. Two stages:
 *
 * 1. buildRows — greedy sequential fill decides which items go in each row, using a
 *    per-row width-cost budget and an aspect-ratio floor check. Row AR during fill
 *    is estimated cheaply from a single point-balance tree (estimateRowAR).
 * 2. buildAtomic — for each finalized row, enumerate order-preserving tree shapes and
 *    H/V direction assignments, then pick the composition whose rendered areas best
 *    track each image's prominence, bounded by an AR floor (never taller than wide)
 *    and a soft ceiling (never a thin strip).
 *
 * Width-cost Hv = √(P·AR) is an item's orientation-agnostic packing cost; a row's
 * fill is ΣHv / rowWidth, and a row is complete once fill reaches MIN_FILL_RATIO.
 *
 * Both stages are unitless — they reason in width-cost, not pixels — with ONE exception:
 * an item that declares {@link Content.minWidth} (a UI block that breaks below a pixel
 * width, never a photograph) makes both membership and composition width-dependent for
 * the row it sits in. Callers opt in by threading a {@link PixelContext}; every caller
 * that does not, and every row whose items declare no minimum, takes the unitless path
 * unchanged. See MIN-WIDTH CONSTRAINT below.
 */

import { EXTREMENESS_RAMP_START } from '@/app/constants';
import type { AnyContentModel, ContentBlankModel } from '@/app/types/Content';
import {
  type AffineHeight,
  combineDeclaredARHorizontal,
  combineDeclaredARVertical,
  combineHorizontal,
  combineMinWidthHorizontal,
  combineMinWidthVertical,
  combineVertical,
  flexibleLeaf,
  heightAt,
  pinnedLeaf,
  solveEqualHeightSplit,
} from '@/app/utils/affineHeight';
import {
  getArExtremeness,
  getEffectiveRating,
  getHeightDemand,
  getMaxWidth,
  getMinWidth,
  getPinnedHeight,
  getProminence,
  getWidthCost,
} from '@/app/utils/contentRatingUtils';
import { getAspectRatio } from '@/app/utils/contentTypeGuards';
import { calculateBoxTreeAspectRatio } from '@/app/utils/rowStructureAlgorithm';

// =============================================================================
// TYPES
// =============================================================================

/** Recursive tree structure for rendering combinations. */
export type BoxTree =
  | { type: 'leaf'; content: AnyContentModel }
  | {
      type: 'combined';
      direction: 'horizontal' | 'vertical';
      children: [BoxTree, BoxTree];
    };

/**
 * The pixels a caller threads to make the engine's one width-dependent corner measurable:
 * the rendered row width and the CSS gap, together or not at all. One parameter rather
 * than two optional holes because the pair is meaningless apart — a width with no gap
 * mis-prices every hbox by 12.8px, a gap with no width prices nothing — and the previous
 * positional `componentWidth?, gap?` signature made "one without the other"
 * representable. Omit it entirely for the unitless path every collection page takes.
 */
export interface PixelContext {
  /** Rendered width of the row in CSS px. */
  componentWidth: number;
  /** CSS gap between adjacent items in px. */
  gap: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Sum of every item's width-cost Hv = √(P·AR). */
function getTotalWidthCost(components: AnyContentModel[]): number {
  return components.reduce((sum, item) => sum + getWidthCost(item), 0);
}

// =============================================================================
// isRowComplete
// =============================================================================

/** Minimum fill ratio for a row to be considered complete. */
export const MIN_FILL_RATIO = 0.9;
/** Maximum fill ratio; rows above this are rejected to avoid squeezing items. */
export const MAX_FILL_RATIO = 1.15;
/**
 * A leading item whose effective rating is at or below this may be passed over so that
 * a solo-eligible hero just behind it leads the row instead.
 */
export const LOW_RATED_THRESHOLD = 2;

/**
 * Whether a set of components fills a row within the acceptable band
 * (MIN_FILL_RATIO to MAX_FILL_RATIO of rowWidth).
 *
 * @param components - Items to check.
 * @param rowWidth - Row width budget (e.g. 5 for desktop).
 */
export function isRowComplete(components: AnyContentModel[], rowWidth: number): boolean {
  if (components.length === 0) return false;

  const totalValue = components.reduce((sum, item) => sum + getWidthCost(item), 0);

  const fill = totalValue / rowWidth;
  return fill >= MIN_FILL_RATIO && fill <= MAX_FILL_RATIO;
}

// =============================================================================
// ROW RESULT
// =============================================================================

/** A row produced by the row-building algorithm. */
export interface RowResult {
  components: AnyContentModel[];
  boxTree: BoxTree;
}

// =============================================================================
// ARCHITECTURE TYPES
// =============================================================================

/** Orientation shorthand for composition decisions. */
export type OrientationShort = 'H' | 'V';

/** Thin view over AnyContentModel with pre-computed fields for composition. */
export interface ImageType {
  source: AnyContentModel;
  title: string;
  ar: OrientationShort;
  numericAR: number;
  effectiveRating: number;
  /** Orientation-agnostic prominence P; the target for area allocation. */
  prominence: number;
  /** Height demand Vv = √(P/AR); drives the per-row target AR. */
  heightDemand: number;
}

/** Recursive composition structure. */
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

/** Convert AnyContentModel to ImageType for composition decisions. */
export function toImageType(item: AnyContentModel): ImageType {
  const numericAR = getAspectRatio(item);
  const ar: OrientationShort = numericAR > 1.0 ? 'H' : 'V';
  const effectiveRating = getEffectiveRating(item);
  const prominence = getProminence(item);
  const heightDemand = getHeightDemand(item);
  const title = 'title' in item ? String(item.title) : `item-${item.id}`;

  return {
    source: item,
    title,
    ar,
    numericAR,
    effectiveRating,
    prominence,
    heightDemand,
  };
}

/** Create a single-image AtomicComponent. */
export function single(img: ImageType): AtomicComponent {
  return { type: 'single', img };
}

/** Create a horizontal pair. */
export function hPair(left: AtomicComponent, right: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'H', children: [left, right] };
}

/** Create a vertical stack. */
export function vStack(top: AtomicComponent, bottom: AtomicComponent): AtomicComponent {
  return { type: 'pair', direction: 'V', children: [top, bottom] };
}

/** Create a left-heavy horizontal chain from one or more images. */
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

/** Convert an AtomicComponent tree to a BoxTree for rendering. */
export function acToBoxTree(component: AtomicComponent): BoxTree {
  if (component.type === 'single') {
    return { type: 'leaf', content: component.img.source };
  }
  return {
    type: 'combined',
    direction: component.direction === 'H' ? 'horizontal' : 'vertical',
    children: [acToBoxTree(component.children[0]), acToBoxTree(component.children[1])],
  };
}

// =============================================================================
// estimateRowAR
// =============================================================================

/** Row AR must be at least targetAR × this value. */
export const AR_FLOOR_MULTIPLIER = 0.7;

/** Never pull a row's target AR below this fraction of the baseline. */
export const ROW_TARGET_AR_MIN_FRACTION = 0.6;
/** Peak height-demand at or below which no pull is applied (≈ a 5★ pano's Vv). */
export const ROW_TARGET_AR_VV_LOW = 1.85;
/** Peak height-demand at or above which the pull is full (≈ a 1:3 portrait hero). */
export const ROW_TARGET_AR_VV_HIGH = 5.0;

/**
 * Per-row target AR: the viewport baseline pulled toward a floor in proportion to
 * the row's peak height-demand (Vv). A row of landscapes keeps the baseline; a row
 * with a tall vertical hero targets a taller (lower-AR) shape so the hero renders
 * bigger. The pull is content-driven, not count-driven, so it does not affect
 * density-to-size behavior.
 */
export function rowTargetAR(items: ImageType[], baseline: number): number {
  const peakVv = items.reduce((max, item) => Math.max(max, item.heightDemand), 0);
  const span = ROW_TARGET_AR_VV_HIGH - ROW_TARGET_AR_VV_LOW;
  const pull = Math.min(1, Math.max(0, (peakVv - ROW_TARGET_AR_VV_LOW) / span));
  const floor = baseline * ROW_TARGET_AR_MIN_FRACTION;
  return baseline - pull * (baseline - floor);
}

/**
 * Maximum images per row. Caps greedy fill and bounds buildAtomic's enumeration
 * (~2^(n-1) candidates for an n-leaf row), so keep it modest.
 */
export const MAX_ROW_IMAGES = 12;

/**
 * Width-cost fraction at or above which an extreme-AR item claims its own full-width
 * row. Paired with an extremeness gate (see isSoloHero): the fraction alone is not
 * enough, since a normal landscape at a small rowWidth can exceed it, which would
 * collapse low-density rows into full-width singles.
 */
export const HERO_SOLO_WIDTH_FRACTION = 0.5;

/**
 * Whether an item should claim its own full-width row. Both gates are required:
 *
 * 1. Extremeness: getArExtremeness ≥ EXTREMENESS_RAMP_START — only images far from
 *    square (in either direction) are eligible.
 * 2. Width-cost: Hv / rowWidth ≥ HERO_SOLO_WIDTH_FRACTION — the item must dominate the
 *    row budget, so a wide pano solos at low density but shares at high density.
 *
 * A tall portrait passes the extremeness gate but its small Hv keeps it below the
 * width-cost bar, so it never solos; its prominence shows as row height via
 * rowTargetAR instead. Disabled on mobile (rowWidth ≤ 2).
 */
export function isSoloHero(item: AnyContentModel, rowWidth: number): boolean {
  if (rowWidth <= 2) return false;
  if (getArExtremeness(getAspectRatio(item)) < EXTREMENESS_RAMP_START) return false;
  return getWidthCost(item) / rowWidth >= HERO_SOLO_WIDTH_FRACTION;
}

// =============================================================================
// MIN-WIDTH CONSTRAINT
// =============================================================================
// The one width-dependent corner of an otherwise unitless engine. An item that
// declares Content.minWidth (an admin panel; never a photograph) needs a pixel
// floor, which costs width from its ROW-MATES: buildRows refuses to admit an item
// that would starve a declared minimum, and pickBestComposition scores a starving
// arrangement out of contention. Both are gated on a single O(n) precheck, so
// content that declares no minimum never reaches any of this.
// =============================================================================

/**
 * The hard constraints a composition can break: starving a declared {@link Content.minWidth}, and
 * failing to span the row within {@link FILL_TOLERANCE_GAPS}. Counted, and compared BEFORE the
 * score — a candidate breaking fewer of them wins outright, whatever the two scores are.
 *
 * Structural, because the numeric alternative could not be proven. This was a `+1000` penalty
 * added into the score, and 1000 cannot outrank `equitySpread`, an unbounded ratio with in-band
 * candidates above 2e7. It held empirically (0 failures over 6000+ generated constrained rows)
 * only because the winner always sits near minimal spread. A lexicographic compare needs no such
 * argument: no score can ever buy a violation.
 *
 * Deliberately not an early return in `consider`: rejecting outright would leave `best` null and
 * hand the row to the `arClosest ?? hChain` fallback, which knows nothing about minimums and would
 * return a starving composition in silence. The graded remainders stay in the score, so when every
 * candidate violates, the one that violates LEAST still wins.
 */
function violationCount(starvation: number, unconsumed: number, fillTolerance: number): number {
  return (starvation > 0 ? 1 : 0) + (unconsumed > fillTolerance ? 1 : 0);
}

/** A leaf's pixel width in a composed row: `share × rowPixels − gapCoeff × gap`. */
interface LeafWidthShare {
  source: AnyContentModel;
  /** Fraction of the row's pixel width, before gaps. */
  share: number;
  /** How many gaps this leaf pays for — fractional, since it pays a share of each. */
  gapCoeff: number;
}

/**
 * Per-leaf WIDTH shares for a direction-assigned composition, with the gap budget carried
 * alongside so a leaf's pixel width can be recovered from a row width.
 *
 * Distinct from {@link leafShares}, which returns AREA shares for the equity score: under
 * a vStack two leaves have the same width but different areas, so area shares would badly
 * under-report the width of a stacked item. Mirrors what
 * `calculateSizesFromBoxTree` does: an hPair spends one gap and splits the remainder ∝ AR,
 * a vStack passes its full width to both children.
 *
 * Bottom-up recurrence for a child folded into an hPair with width factor `f`:
 * `share' = f · share` and `gapCoeff' = share' + gapCoeff` — the child pays its share of
 * this node's gap on top of whatever gaps it already owed.
 *
 * This is an ESTIMATE, and the size of its error is part of the feature's contract. It
 * omits the equal-height `b` correction that {@link computeHeightCoeffs} feeds the real
 * sizer, which shifts a boundary whenever nested subtrees carry different internal gap
 * budgets. Measured against `calculateSizesFromBoxTree` over 3000 random compositions,
 * `estimate − real` ranges from **−9.08px to +14.85px** — the optimistic tail exceeds a
 * full 12.8px desktop gap, so a leaf can render slightly under its declared minimum
 * (measured worst case 3.54px / 1.63%; see {@link Content.minWidth}). Threading `b`
 * through would close that gap at the cost of duplicating the sizer's solve inside the
 * candidate loop, which is not worth it for a few pixels on a UI block.
 */
function leafWidthShares(component: AtomicComponent): { ar: number; leaves: LeafWidthShare[] } {
  if (component.type === 'single') {
    return {
      ar: component.img.numericAR,
      leaves: [{ source: component.img.source, share: 1, gapCoeff: 0 }],
    };
  }

  const left = leafWidthShares(component.children[0]);
  const right = leafWidthShares(component.children[1]);
  const sum = left.ar + right.ar;

  if (component.direction === 'V') {
    return { ar: (left.ar * right.ar) / sum, leaves: [...left.leaves, ...right.leaves] };
  }

  const scale = (leaves: LeafWidthShare[], factor: number): LeafWidthShare[] =>
    leaves.map(leaf => {
      const share = leaf.share * factor;
      return { source: leaf.source, share, gapCoeff: share + leaf.gapCoeff };
    });

  return {
    ar: sum,
    leaves: [...scale(left.leaves, left.ar / sum), ...scale(right.leaves, right.ar / sum)],
  };
}

/**
 * Total relative shortfall of a composition against its members' declared minimums:
 * Σ (minWidth − renderedWidth) / minWidth over the starved leaves, 0 when none starve.
 *
 * Relative rather than absolute so the measure is comparable across items with different
 * minimums, and graded rather than boolean so that when every candidate starves, the one
 * that starves LEAST still wins.
 */
function minWidthDeficit(component: AtomicComponent, componentWidth: number, gap: number): number {
  let deficit = 0;
  for (const leaf of renderedLeafWidths(component, componentWidth, gap)) {
    const minWidth = getMinWidth(leaf.source);
    if (minWidth === undefined) continue;
    if (leaf.width < minWidth) deficit += (minWidth - leaf.width) / minWidth;
  }
  return deficit;
}

/**
 * Slack-pocket ceiling for a pinned row to count as composed clean: the best composition may
 * leave at most this fraction of its bounding box blank. Small mismatches between stacked
 * columns (a 986px column beside a 973px one) sit well under it; the pockets Zac's review
 * flagged — a 305px row carrying a 125px bar column, a 986px row carrying two bars — score
 * 0.2–0.4 and are exactly what this exists to reject.
 */
const POCKET_TOLERANCE = 0.05;

/**
 * How far two pinned blocks' rendered widths may differ and still count as one shared width,
 * in gaps. An allowance for a known artifact rather than design latitude: {@link
 * renderedLeafWidths} charges an hbox's two sides for the dividing gap asymmetrically, so
 * members the sizer puts in ONE column can be reported half a gap apart.
 *
 * Measured over the hub's states, the two populations do not overlap and do not come close:
 * same-column spreads land at 4.9–6.4px (≤ gap/2), genuinely-split columns at 24–148px. One
 * gap sits in the empty band between them, and scales with the gap the artifact comes from.
 *
 * This tolerance is NOT the contract. It is what the membership predicate allows itself while
 * reading a reporting artifact; what a shipped row must satisfy is tighter, and is asserted in
 * `tests/(admin)/admin/page.collapseStates.test.ts` — 'renders every panel in a row at one shared
 * width', which rounds each panel's rendered width to a whole pixel and requires ONE distinct
 * value across all 80 width × collapse-state combinations. So 12.8px of latitude here has to keep
 * producing widths that agree to the rounded pixel there; raising this number past the empty band
 * would admit rows that fail that assertion.
 */
const PINNED_WIDTH_SPREAD_GAPS = 1;

/** Result of {@link firstCleanExtension}: the clean count to grow to, and what it strands. */
interface CleanExtension {
  count: number;
  /** True when growing to `count` leaves exactly ONE eligible item for the next row. */
  strandsOne: boolean;
}

/**
 * The pinned-row membership test: smallest count ≥ `fromCount` whose row composes CLEAN — the
 * best composition starves nothing, spans the row width to within the fill tolerance, renders
 * every pinned block at one shared width, and pockets no more than {@link POCKET_TOLERANCE} of
 * its box — or null when no extension within the window does. Those four are Zac's fill rules,
 * one predicate each. Candidates skip the already-skipped standalones AND any not-yet-visited solo
 * hero, mirroring what the fill loop will do when it reaches them, so a returned count means
 * exactly "keep adding until `sequentialCount` reaches me".
 *
 * Cleanness is a statement about THIS row; what a count leaves behind matters too. A clean
 * count that strands a single leftover item hands the next row a full-width solo (a portrait
 * nav tile alone became a 1593px-tall row in probing), so among clean counts the first one
 * that does NOT strand a lone item wins; a stranding count is returned — flagged — only when
 * it is the only clean option, and the caller decides whether standing pat beats taking it.
 *
 * O(window²) compositions in the worst case, bounded by `MAX_ROW_IMAGES`; only rows whose
 * window could still hand them a pinned member ever pay it.
 */
function firstCleanExtension(
  window: AnyContentModel[],
  fromCount: number,
  skippedStandalones: number[],
  rowWidth: number,
  targetARBaseline: number,
  componentWidth: number,
  gap: number
): CleanExtension | null {
  const eligible: AnyContentModel[] = [];
  for (let i = 0; i < window.length; i++) {
    if (skippedStandalones.includes(i)) continue;
    if (eligible.length > 0 && isSoloHero(window[i]!, rowWidth)) continue;
    eligible.push(window[i]!);
  }

  const isClean = (count: number): boolean => {
    const imgs = eligible.slice(0, count).map(item => toImageType(item));
    const composition = buildAtomic(imgs, rowTargetAR(imgs, targetARBaseline), {
      componentWidth,
      gap,
    });
    if (minWidthDeficit(composition, componentWidth, gap) > 0) return false;
    const unconsumed = componentWidth - consumedWidth(composition, componentWidth, gap);
    if (unconsumed > FILL_TOLERANCE_GAPS * gap) return false;
    if (pinnedWidthSpread(composition, componentWidth, gap) > PINNED_WIDTH_SPREAD_GAPS * gap) {
      return false;
    }
    return slackFraction(composition, componentWidth, gap) <= POCKET_TOLERANCE;
  };

  let stranding: CleanExtension | null = null;
  for (let count = fromCount; count <= eligible.length; count++) {
    if (!isClean(count)) continue;
    if (eligible.length - count !== 1) return { count, strandsOne: false };
    stranding ??= { count, strandsOne: true };
  }
  return stranding;
}

/**
 * Widest minus narrowest rendered width among a row's PINNED blocks — 0 when the row carries
 * fewer than two, which is every row that is not an admin hub row.
 *
 * The third of Zac's fill rules, in the same measured form as the other two: "when we combine
 * all 3 dropdown contentComponents … the width should be the SAME for all of them". A row can
 * span the body and pocket nothing and still put one panel at its 400px floor beside two
 * collapsed bars at 762 — the packer is content, the page reads as three unrelated widths.
 *
 * PINNED is the generic spelling of "UI block" here, and it is the right one: a pinned height
 * is exactly the property that makes width the block's only free variable, so a shared width is
 * the only thing left that can make a set of them read as one group. A nav tile declares a
 * minimum but no pin, and is deliberately NOT held to this — tiles are photographs and size to
 * their own aspect ratios.
 *
 * Reads widths from {@link renderedLeafWidths}, which under a pin is the sizer's own solve
 * rather than the share estimate — close, but not gap-for-gap identical, which is what
 * {@link PINNED_WIDTH_SPREAD_GAPS} exists to absorb. It also does not narrow a column to
 * `subtreeMaxWidth` the way the sizer does, so a binding cap can over-report a spread. Both
 * errors point the same way: decline a row that would have rendered clean. The failure mode is
 * a membership change, never a broken render.
 */
function pinnedWidthSpread(
  component: AtomicComponent,
  componentWidth: number,
  gap: number
): number {
  const widths = renderedLeafWidths(component, componentWidth, gap)
    .filter(leaf => getPinnedHeight(leaf.source) !== undefined)
    .map(leaf => leaf.width);
  return widths.length < 2 ? 0 : Math.max(...widths) - Math.min(...widths);
}

/** Whether any leaf under this composition declares a pinned (width-independent) height. */
function hasPinnedLeaf(component: AtomicComponent): boolean {
  if (component.type === 'single') return getPinnedHeight(component.img.source) !== undefined;
  return hasPinnedLeaf(component.children[0]) || hasPinnedLeaf(component.children[1]);
}

/**
 * Pixel width each leaf renders at, in a composition of `componentWidth` px.
 *
 * Two paths, and the split matters. Without a pinned member this is the AR-share ESTIMATE
 * {@link leafWidthShares} has always produced, error bars and all, so no photo row changes.
 *
 * With one, that estimate is not merely imprecise — it is wrong in a way that inverts the
 * answer. `leafWidthShares` derives width from `numericAR`, and a stack of panels declaring
 * 600×1100 combines to an AR near zero, so it concludes the stack should be a sliver and
 * reports every panel in it as starved. That is what made "Roles under Messages under a tile"
 * score 1000+ on starvation and lose to a two-column arrangement that leaves a third of the
 * row blank. Under a pin, widths come from the sizer's own solve instead — exact rather than
 * estimated, because the same {@link AffineHeight} model drives both.
 */
function renderedLeafWidths(
  component: AtomicComponent,
  componentWidth: number,
  gap: number
): Array<{ source: AnyContentModel; width: number }> {
  if (!hasPinnedLeaf(component)) {
    return leafWidthShares(component).leaves.map(leaf => ({
      source: leaf.source,
      width: leaf.share * componentWidth - leaf.gapCoeff * gap,
    }));
  }

  if (component.type === 'single') {
    return [{ source: component.img.source, width: componentWidth }];
  }

  if (component.direction === 'V') {
    return [
      ...renderedLeafWidths(component.children[0], componentWidth, gap),
      ...renderedLeafWidths(component.children[1], componentWidth, gap),
    ];
  }

  const leftWidth = splitLeftWidth(component, componentWidth, gap);
  return [
    ...renderedLeafWidths(component.children[0], leftWidth, gap),
    ...renderedLeafWidths(component.children[1], componentWidth - gap - leftWidth, gap),
  ];
}

/**
 * Whether composing `items` as one row would starve a declared minimum — the membership
 * question, answered by actually composing the candidate row and measuring it.
 *
 * A single item is never starved: the row cannot be made any wider by evicting anyone, so
 * an unsatisfiable minimum degrades to the full available width instead (see
 * {@link Content.minWidth}). That also means this never promotes an item to its own row.
 *
 * The second early return keeps the cost proportional to the constraint rather than to
 * the page: `buildRows`' precheck is true for a whole page as soon as ONE item declares a
 * minimum, and without this a long photo collection carrying a single panel would compose
 * every unrelated row twice.
 */
function starvesMinWidth(
  items: AnyContentModel[],
  targetARBaseline: number,
  componentWidth: number,
  gap: number
): boolean {
  if (items.length <= 1) return false;
  if (!items.some(item => getMinWidth(item) !== undefined)) return false;
  const imgs = items.map(item => toImageType(item));
  const composition = buildAtomic(imgs, rowTargetAR(imgs, targetARBaseline), {
    componentWidth,
    gap,
  });
  return minWidthDeficit(composition, componentWidth, gap) > 0;
}

// =============================================================================
// BLANK PADDING
// =============================================================================

/**
 * Base for synthetic blank-spacer ids. Blanks count down from here
 * (`BLANK_ID_BASE - rowIndex`), far below any real content id, so they never
 * collide in a sizesMap or a React key.
 */
export const BLANK_ID_BASE = -1_000_000;

/**
 * Build a blank spacer leaf. The aspect ratio is encoded as width/height so the
 * blank sizes through the same `getContentDimensions` path as a real leaf.
 * `visible` must stay true, or `isContentVisibleInCollection` would trip the
 * "Non-Visible Content" separator.
 */
function createBlankLeaf(aspectRatio: number, id: number): BoxTree {
  const blank: ContentBlankModel = {
    id,
    contentType: 'BLANK',
    orderIndex: 0,
    visible: true,
    width: aspectRatio,
    height: 1,
  };
  return { type: 'leaf', content: blank };
}

/**
 * Pad a genuine end-of-page leftover row with a trailing blank spacer so its
 * real content keeps its honest share of the width instead of being scaled up
 * to full page width.
 *
 * Reserving space is an END-OF-PAGE concern, not an every-under-filled-row one.
 * Greedy fill from the front means only the LAST row can be a content-exhaustion
 * leftover; every earlier under-filled row was closed by a deliberate decision
 * (overfill-avoidance, or the {@link MAX_ROW_IMAGES} cap) and is a complete,
 * intentional row that must fill the width. A single-image mobile row is the
 * canonical example — a second image would overfill, so the row is complete at
 * one image and should fill the phone width, never sprout a spacer.
 *
 * Three gates decide a genuine leftover:
 * 1. **isLastRow** — only the trailing row can be a leftover.
 * 2. **Under-filled** — real width-cost below MIN_FILL_RATIO of the budget.
 * 3. **Had room for more** — the row could still have absorbed another item
 *    (a second copy of its smallest item stays within MAX_FILL_RATIO). A row
 *    that is under-filled only because it is already at capacity (any further
 *    item would overfill — every narrow-budget single-image row) is complete,
 *    not a leftover, and fills the width.
 *
 * When padded we append a horizontal blank sibling sized to absorb the leftover
 * width; the real subtree is nested untouched, so every item keeps its aspect
 * ratio. Padding is viewport-relative, so a higher-rated item fills more of the
 * row. Solo heroes are skipped -- their full-width row is intentional.
 *
 * Rows holding a {@link Content.minWidth} member are skipped too, and that guard is
 * load-bearing rather than cosmetic: this runs AFTER composition has already satisfied
 * every minimum, and shrinking each real item to its width-cost share would silently undo
 * that. The case is not hypothetical — a lone admin panel on a phone is exactly an
 * under-filled last row, and padding it would hand a 390px panel ~215px of that width.
 * Skipping is also the right answer on the merits: a block that declares a pixel floor is
 * a deliberate UI shape, not a leftover photo that should keep an honest width share.
 *
 * That guard is the ONE part of the feature not gated on the caller threading a
 * {@link PixelContext}, and deliberately so. Padding is a decision about the row's
 * shape, not about pixels — it needs no width to make — and the declaration alone is
 * enough to know the block is a UI shape. Gating it would mean an unthreaded caller
 * silently re-shrinks a block that asked not to be shrunk, which is the failure this
 * guard exists to prevent; leaving it ungated only ever declines to pad, which is the
 * conservative direction.
 *
 * Guards return the row unchanged when width-cost is zero/NaN or the row's
 * aspect ratio is non-positive (degenerate zero-width content).
 */
function padRowToWidth(
  row: RowResult,
  rowWidth: number,
  rowIndex: number,
  isLastRow: boolean
): RowResult {
  const realWidthCost = getTotalWidthCost(row.components);
  if (!(realWidthCost > 0)) return row;
  if (!isLastRow) return row;
  if (realWidthCost / rowWidth >= MIN_FILL_RATIO) return row;
  if (row.components.length === 1 && isSoloHero(row.components[0]!, rowWidth)) return row;
  if (row.components.some(item => getMinWidth(item) !== undefined)) return row;

  const smallestWidthCost = Math.min(...row.components.map(getWidthCost));
  if ((realWidthCost + smallestWidthCost) / rowWidth > MAX_FILL_RATIO) return row;

  const realAspectRatio = calculateBoxTreeAspectRatio(row.boxTree);
  if (realAspectRatio <= 0) return row;

  const leftoverWidth = rowWidth - realWidthCost;
  const blankAspectRatio = (realAspectRatio * leftoverWidth) / realWidthCost;

  return {
    ...row,
    boxTree: {
      type: 'combined',
      direction: 'horizontal',
      children: [row.boxTree, createBlankLeaf(blankAspectRatio, BLANK_ID_BASE - rowIndex)],
    },
  };
}

/**
 * Estimate a row's combined aspect ratio via the cheap single-structure composer
 * (point-balance tree only), keeping the Stage-1 fill loop fast. The expensive
 * multi-structure equity search runs only at final per-row composition.
 *
 * The invariant that buys this: row-membership decisions never run the expensive
 * search, so density-to-size behavior stays independent of how a row is composed.
 *
 * {@link Content.minWidth} is the one deliberate exception, and it does not weaken the
 * invariant for anyone else. A pixel floor cannot be answered from width-cost alone —
 * "does a composition exist that keeps this item above N px?" is a question only the
 * composer can answer — so `starvesMinWidth` runs the full search once per candidate row
 * size, but ONLY for rows whose items declare a minimum (admin panels; nothing in a photo
 * collection does). Density-to-size behavior for scale-free content is untouched.
 */
export function estimateRowAR(images: ImageType[], targetAR: number): number {
  if (images.length === 0) throw new Error('estimateRowAR requires at least 1 image');
  if (images.length === 1) {
    return calculateBoxTreeAspectRatio(acToBoxTree(single(images[0]!)));
  }
  const tree = splitByPointBalance(images);
  const composition = pickRootAssignment(tree, targetAR);
  return calculateBoxTreeAspectRatio(acToBoxTree(composition));
}

// =============================================================================
// buildRows
// =============================================================================

/** Collect the first `count` non-skipped items from a window. */
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

/**
 * Row-first layout. Over a lookahead window it optionally skips a leading low-rated
 * run to surface a solo hero, greedily fills by width-cost Hv, falls back to best-fit,
 * then builds each row's atomic tree. A wide top-rated panorama claiming its own row
 * is an emergent result of its large Hv exceeding the budget, not a special case. The
 * AR-floor check is disabled on mobile (rowWidth ≤ 2).
 *
 * Three fill decisions that are not self-evident from the code:
 * 1. The fill bar (effectiveMinFill) is the constant MIN_FILL_RATIO, not a scaled one.
 *    Density already drives packing through rowWidth, so a rowWidth-scaled bar would
 *    over-inflate past MAX_FILL_RATIO at high density.
 * 2. A row still under that bar accepts one moderate overfill (newFill up to 1.35)
 *    rather than closing short — a lone under-filled row reads worse than a slightly
 *    tight one.
 * 3. A solo-eligible item met after the row has started is skipped rather than taken,
 *    so it surfaces as a leading solo hero on the next iteration and gets its own row.
 *
 * A fourth applies only when some item declares a {@link Content.minWidth}: the row
 * closes rather than admit an item that would starve that minimum. It is the only fill
 * decision made in pixels, it can never leave a row empty (a lone item's unsatisfiable
 * minimum degrades instead), and it is skipped entirely — via one hoisted precheck — for
 * content that declares no minimum.
 *
 * @param rowWidth - Row width budget (5 desktop, 4 tablet, etc.).
 * @param targetARBaseline - Baseline (viewport) target AR. Fill and estimate use it
 *   directly; each row derives a per-row target from it via rowTargetAR.
 * @param pixelContext - Rendered row width and CSS gap. Optional: supply it only to
 *   enable min-width enforcement; omitting it keeps the layout purely unitless.
 */
export function buildRows(
  items: AnyContentModel[],
  rowWidth: number,
  targetARBaseline: number = 1.5,
  pixelContext?: PixelContext
): RowResult[] {
  const rows: RowResult[] = [];
  const remaining = [...items];

  const effectiveMinFill = MIN_FILL_RATIO;

  // Pixel-aware membership needs usable pixels, and "usable" means finite: a NaN width would
  // make every deficit and every clean-extension test NaN, and NaN fails every comparison, so
  // the guards would quietly wave through the rows they exist to close. Falling back to the
  // unitless fill loop is the same code every collection page runs.
  const hasPixels =
    pixelContext !== undefined &&
    Number.isFinite(pixelContext.componentWidth) &&
    Number.isFinite(pixelContext.gap);
  const rowPixels = hasPixels ? pixelContext.componentWidth : 0;
  const rowGap = hasPixels ? pixelContext.gap : 0;

  // One O(n) precheck, hoisted above every loop below. False for every collection page —
  // no photograph declares a minimum — and then the fill loops are the pre-feature code.
  const constrained = hasPixels && items.some(item => getMinWidth(item) !== undefined);

  /**
   * Third O(n) precheck, same discipline as `constrained`: false for every photo collection, and
   * then the fill loop below is the pre-feature code exactly. See the fill-cap comment for why a
   * pinned member invalidates the width-cost budget's stopping rule.
   *
   * PAGE-scoped, and therefore only a gate — the question the fill loop asks is per-row, so it is
   * re-asked over each window below. Mirrors `starvesMinWidth`, which pairs this same cheap page
   * precheck with a per-candidate re-test.
   */
  const pageHasPinnedMember =
    constrained && items.some(item => getPinnedHeight(item) !== undefined);

  while (remaining.length > 0) {
    const window = remaining.slice(0, 5);

    if (isSoloHero(window[0]!, rowWidth)) {
      const heroItem = window[0]!;
      rows.push({
        components: [heroItem],
        boxTree: acToBoxTree(single(toImageType(heroItem))),
      });
      remaining.splice(0, 1);
      continue;
    }

    const item0Rating = getEffectiveRating(window[0]!);

    if (item0Rating <= LOW_RATED_THRESHOLD) {
      const maxSearch = Math.min(3, window.length);
      let heroIdx = -1;

      for (let i = 1; i < maxSearch; i++) {
        if (isSoloHero(window[i]!, rowWidth)) {
          heroIdx = i;
          break;
        }
      }

      if (heroIdx >= 0) {
        const heroItem = window[heroIdx]!;
        const heroImg = toImageType(heroItem);
        const composition = single(heroImg);
        const boxTree = acToBoxTree(composition);

        rows.push({
          components: [heroItem],
          boxTree,
        });

        remaining.splice(heroIdx, 1);
        continue;
      }
    }

    const arFloor = rowWidth <= 2 ? 0 : targetARBaseline * AR_FLOOR_MULTIPLIER;
    const expandedWindow = remaining.slice(0, MAX_ROW_IMAGES);

    /**
     * Whether THIS row could carry a pinned block — the window is exactly the set of items that
     * may still join it, so this is the honest scope for a question about the row's geometry. A
     * page-scoped answer would make one pinned block anywhere pay `firstCleanExtension` on every
     * unrelated row (a photo collection carrying a single admin panel), which is the cost
     * `constrained` and `starvesMinWidth` are both careful to avoid.
     *
     * No width test guards this, and none is wanted. `firstCleanExtension` will not grow a row
     * whose composition starves a declared minimum, so a viewport too narrow for a second column
     * closes at one block on the strength of that alone — while a width test drawn at
     * `2 × minWidth + gap` also switched the rules off across a whole band of real desktops
     * (742–812px), where the composer went on scoring by the pinned model and the two halves of
     * the engine disagreed about the same row.
     */
    const hasPinnedMember =
      pageHasPinnedMember && expandedWindow.some(item => getPinnedHeight(item) !== undefined);

    let sequentialTotal = 0;
    let sequentialCount = 0;
    const skippedStandalones: number[] = [];
    let slotCountComplete = false;
    let commitThrough = 0;

    for (let i = 0; i < expandedWindow.length; i++) {
      const widthCost = getWidthCost(expandedWindow[i]!);

      if (sequentialCount > 0 && isSoloHero(expandedWindow[i]!, rowWidth)) {
        skippedStandalones.push(i);
        continue;
      }

      // Membership guard: item i is the (sequentialCount + 1)-th unskipped item, so this
      // asks "would the row I am about to grow fail its declared constraints?" and closes
      // the row at its current members if so. Placed ahead of all three add sites below —
      // the moderate-overfill accept, the AR-widening pass, and the plain fill — so none
      // of them can slip an item past it.
      //
      // Pinned rows get the stronger form: a row must COMPOSE CLEAN — no starved minimum, no
      // unconsumed width past the fill tolerance (a capped column asked to carry width its
      // members may not render), one shared width across its pinned blocks, and no slack pocket
      // past the pocket tolerance. And because pinned geometry is non-monotonic in the member
      // count — [users, bar, roles] can only pocket while [users, bar, roles, tile] fills the
      // box exactly — a defective candidate closes the row only after a LOOKAHEAD through the
      // window fails to find a farther clean extension. Growth may pass through defective
      // intermediates; it must LAND clean.
      if (constrained && sequentialCount > 0 && sequentialCount + 1 > commitThrough) {
        if (hasPinnedMember) {
          const clean = firstCleanExtension(
            expandedWindow,
            sequentialCount + 1,
            skippedStandalones,
            rowWidth,
            targetARBaseline,
            rowPixels,
            rowGap
          );
          if (clean === null) break;
          // A clean extension that strands a single leftover hands the next row a full-width
          // solo. When the row already stands at a validated clean count, closing here beats
          // growing into that; when it does not, landing clean — even stranding — still beats
          // closing on a defective row.
          if (clean.strandsOne && commitThrough > 0 && sequentialCount === commitThrough) break;
          commitThrough = clean.count;
        } else if (
          starvesMinWidth(
            collectRowItems(expandedWindow, sequentialCount + 1, skippedStandalones),
            targetARBaseline,
            rowPixels,
            rowGap
          )
        ) {
          break;
        }
      }

      const newFill = (sequentialTotal + widthCost) / rowWidth;

      // The width-cost budget measures a row laid out SIDE BY SIDE — every member charged for
      // horizontal space. A row containing a pinned block is not laid out that way: the composer
      // stacks short blocks into a shared column, and two items in one column cost one item's
      // width. So the budget systematically under-counts how much such a row holds, and closing
      // on it strands items that would have fitted. On the hub it stranded the third nav tile,
      // which then took its own row beside ~1000px of blank padding.
      //
      // The membership guard above is the honest stopping condition here: it composes the larger
      // row for real and closes when a member would fall under its declared minimum. That is a
      // width test on the actual arrangement rather than an estimate of one, so it cannot be
      // fooled by stacking. `MAX_ROW_IMAGES` still bounds the loop.
      if (newFill > MAX_FILL_RATIO && !slotCountComplete && !hasPinnedMember) {
        const currentFill = sequentialTotal / rowWidth;
        if (currentFill < effectiveMinFill && newFill <= 1.35) {
          sequentialTotal += widthCost;
          sequentialCount += 1;
        }
        break;
      }

      if (slotCountComplete) {
        const candidateRating = getEffectiveRating(expandedWindow[i]!);
        if (candidateRating >= 4) {
          break;
        }

        sequentialTotal += widthCost;
        sequentialCount += 1;

        const expandedItems = collectRowItems(expandedWindow, sequentialCount, skippedStandalones);
        const expandedImgs = expandedItems.map(item => toImageType(item));
        const expandedAR = estimateRowAR(expandedImgs, targetARBaseline);
        if (expandedAR >= arFloor) break;
        continue;
      }

      sequentialTotal += widthCost;
      sequentialCount += 1;

      // Same reasoning as the fill-cap above, and this is the check that actually closed the hub's
      // first row: a row reaches MIN_FILL_RATIO and declares itself complete long before a stacked
      // column is full. Both the fill and `estimateRowAR` are computed from declared aspect
      // ratios, which a pinned block does not have — so on a pinned row this asks a question about
      // a layout that is not the one being built. The membership guard is left as the only
      // stopping rule, and it is a real one: it composes the larger row and closes when a member
      // would fall under its declared minimum. `MAX_ROW_IMAGES` bounds the loop regardless.
      if (newFill >= effectiveMinFill && !hasPinnedMember) {
        const rowItems = collectRowItems(expandedWindow, sequentialCount, skippedStandalones);
        const rowImgs = rowItems.map(item => toImageType(item));
        const rowAR = estimateRowAR(rowImgs, targetARBaseline);

        if (rowAR >= arFloor) {
          break;
        }
        slotCountComplete = true;
      }
    }

    if (sequentialCount > 0) {
      const rowItems = collectRowItems(expandedWindow, sequentialCount, skippedStandalones);
      const rowImgs = rowItems.map(item => toImageType(item));
      const composition = buildAtomic(
        rowImgs,
        rowTargetAR(rowImgs, targetARBaseline),
        pixelContext
      );
      const boxTree = acToBoxTree(composition);

      rows.push({
        components: rowItems,
        boxTree,
      });

      const usedIndices = new Set<number>();
      let taken = 0;
      for (let i = 0; i < expandedWindow.length && taken < sequentialCount; i++) {
        if (!skippedStandalones.includes(i)) {
          usedIndices.add(i);
          taken++;
        }
      }
      const sortedUsed = [...usedIndices].sort((a, b) => b - a);
      for (const idx of sortedUsed) {
        remaining.splice(idx, 1);
      }
      continue;
    }

    const bestFitComponents: AnyContentModel[] = [];
    const bestFitUsedIndices: number[] = [];
    const available = new Set(window.map((_, i) => i));

    bestFitComponents.push(window[0]!);
    bestFitUsedIndices.push(0);
    available.delete(0);

    if (!isRowComplete(bestFitComponents, rowWidth)) {
      for (let idx = 1; idx < window.length; idx++) {
        if (!available.has(idx)) continue;

        // The same membership guard as the greedy loop. This path is reached only when
        // greedy fill took nothing at all, so it starts a row from scratch and can starve
        // a minimum in exactly the same way. `break` rather than `continue` is deliberate
        // and matches the greedy loop: one starving candidate closes the row, instead of
        // skipping past it to a later window item, which would reorder content to squeeze
        // in a filler.
        if (
          constrained &&
          starvesMinWidth([...bestFitComponents, window[idx]!], targetARBaseline, rowPixels, rowGap)
        ) {
          break;
        }

        const currentTotal = getTotalWidthCost(bestFitComponents);
        const candidateWidthCost = getWidthCost(window[idx]!);
        const newTotal = currentTotal + candidateWidthCost;
        const newFill = newTotal / rowWidth;

        if (newFill > MAX_FILL_RATIO) {
          const currentFill = currentTotal / rowWidth;
          const underfillDistance = Math.abs(1.0 - currentFill);
          const overfillDistance = Math.abs(1.0 - newFill);

          if (currentFill >= MIN_FILL_RATIO) {
            break;
          }
          if (underfillDistance <= overfillDistance) {
            continue;
          }
          bestFitComponents.push(window[idx]!);
          bestFitUsedIndices.push(idx);
          break;
        }

        bestFitComponents.push(window[idx]!);
        bestFitUsedIndices.push(idx);
        available.delete(idx);

        if (isRowComplete(bestFitComponents, rowWidth)) {
          break;
        }
      }
    }

    const bestFitImgs = bestFitComponents.map(item => toImageType(item));
    const composition = buildAtomic(
      bestFitImgs,
      rowTargetAR(bestFitImgs, targetARBaseline),
      pixelContext
    );
    const boxTree = acToBoxTree(composition);

    rows.push({
      components: bestFitComponents,
      boxTree,
    });

    const sortedIndices = [...bestFitUsedIndices].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      remaining.splice(idx, 1);
    }
  }

  const lastRowIndex = rows.length - 1;
  return rows.map((row, rowIndex) =>
    padRowToWidth(row, rowWidth, rowIndex, rowIndex === lastRowIndex)
  );
}

// =============================================================================
// ROW COMPOSITION
// =============================================================================
// buildAtomic composes each finalized row: it enumerates candidate tree shapes
// (enumerateStructures) and every H/V direction assignment, then selects the one
// whose leaf areas best track prominence P under a hard AR-1.0 floor and a soft
// CEILING_MULT ceiling. The cheap single point-balance split (splitByPointBalance +
// pickRootAssignment) backs only the Stage-1 AR estimator.
// Algorithm & rationale: ./rowCombination.md
// =============================================================================

type AbstractNode =
  | { kind: 'leaf'; img: ImageType }
  | { kind: 'merge'; left: AbstractNode; right: AbstractNode };

/**
 * Build an unlabeled binary tree by recursively splitting at the adjacent boundary
 * whose two halves have the closest effectiveRating sums. Balances on effectiveRating,
 * not width-cost, so the split reflects prominence rather than packing width. Order is
 * preserved — only adjacent splits, never swaps.
 */
function splitByPointBalance(items: ImageType[]): AbstractNode {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return { kind: 'leaf', img: items[0]! };

  if (items.length === 2) {
    return {
      kind: 'merge',
      left: { kind: 'leaf', img: items[0]! },
      right: { kind: 'leaf', img: items[1]! },
    };
  }

  let total = 0;
  for (const item of items) total += item.effectiveRating;
  const half = total / 2;

  const middleGapIdx = (items.length - 2) / 2;
  let leftSum = 0;
  let bestGapIdx = 0;
  let bestScore = Infinity;
  let bestMidDist = Infinity;
  for (let i = 0; i < items.length - 1; i++) {
    leftSum += items[i]!.effectiveRating;
    const rightSum = total - leftSum;
    const score = Math.abs(leftSum - half) + Math.abs(rightSum - half);
    const midDist = Math.abs(i - middleGapIdx);
    if (score < bestScore || (score === bestScore && midDist < bestMidDist)) {
      bestGapIdx = i;
      bestScore = score;
      bestMidDist = midDist;
    }
  }

  const splitPoint = bestGapIdx + 1;
  return {
    kind: 'merge',
    left: splitByPointBalance(items.slice(0, splitPoint)),
    right: splitByPointBalance(items.slice(splitPoint)),
  };
}

// =============================================================================
// Candidate structure generator
// =============================================================================

/**
 * Full-enumeration cutoff. For n ≤ N_FULL emit every order-preserving binary tree
 * (the Catalan set: C(n-1) shapes, 42 for n=6); for n > N_FULL use the bounded
 * generator instead.
 */
const N_FULL = 6;

/**
 * Hard cap on shapes generated for n > N_FULL. Bounds the structure × direction
 * search so an n=12 row composes within budget (~11k candidates, a few ms).
 */
const STRUCTURE_CAP = 64;

/**
 * Every order-preserving binary tree shape over `items` (the Catalan set), memoized
 * on (lo, hi) ranges. Cost is C(n-1) shapes, so it is guarded by N_FULL upstream.
 */
function enumerateFullShapes(items: ImageType[]): AbstractNode[] {
  const memo = new Map<string, AbstractNode[]>();
  const build = (lo: number, hi: number): AbstractNode[] => {
    if (lo === hi) return [{ kind: 'leaf', img: items[lo]! }];
    const key = `${lo},${hi}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const out: AbstractNode[] = [];
    for (let split = lo; split < hi; split++) {
      const lefts = build(lo, split);
      const rights = build(split + 1, hi);
      for (const left of lefts) {
        for (const right of rights) {
          out.push({ kind: 'merge', left, right });
        }
      }
    }
    memo.set(key, out);
    return out;
  };
  return build(0, items.length - 1);
}

/**
 * Bounded shape generator for n > N_FULL. Seeds the point-balance tree first (so the
 * result is never worse than the single-structure path), then adds alternative
 * top-level splits and a few leaf-to-root shapes (which can hand a hero its own
 * full-height column), all capped at STRUCTURE_CAP.
 */
function enumerateBoundedShapes(items: ImageType[]): AbstractNode[] {
  const seen = new Set<string>();
  const shapes: AbstractNode[] = [];

  const keyOf = (node: AbstractNode): string =>
    node.kind === 'leaf' ? `L${node.img.source.id}` : `(${keyOf(node.left)}|${keyOf(node.right)})`;

  const push = (node: AbstractNode): boolean => {
    const key = keyOf(node);
    if (seen.has(key)) return true;
    seen.add(key);
    shapes.push(node);
    return shapes.length < STRUCTURE_CAP;
  };

  const rankedSplits = (slice: ImageType[]): number[] => {
    let total = 0;
    for (const item of slice) total += item.effectiveRating;
    const half = total / 2;
    const scored: Array<{ idx: number; score: number }> = [];
    let leftSum = 0;
    for (let i = 0; i < slice.length - 1; i++) {
      leftSum += slice[i]!.effectiveRating;
      const rightSum = total - leftSum;
      scored.push({ idx: i, score: Math.abs(leftSum - half) + Math.abs(rightSum - half) });
    }
    scored.sort((a, b) => a.score - b.score);
    return scored.map(entry => entry.idx);
  };

  if (!push(splitByPointBalance(items))) return shapes;

  const topSplits = rankedSplits(items);
  for (let i = 0; i < topSplits.length; i++) {
    const split = topSplits[i]! + 1;
    const alt: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, split)),
      right: splitByPointBalance(items.slice(split)),
    };
    if (!push(alt)) return shapes;
  }

  for (let lead = 1; lead <= Math.min(2, items.length - 1); lead++) {
    const leftLead: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, lead)),
      right: splitByPointBalance(items.slice(lead)),
    };
    if (!push(leftLead)) return shapes;
    const trail = items.length - lead;
    const rightLead: AbstractNode = {
      kind: 'merge',
      left: splitByPointBalance(items.slice(0, trail)),
      right: splitByPointBalance(items.slice(trail)),
    };
    if (!push(rightLead)) return shapes;
  }

  return shapes;
}

/**
 * Candidate structure generator. Returns order-preserving binary tree shapes: the
 * full Catalan set for n ≤ N_FULL, otherwise a bounded set (STRUCTURE_CAP) that
 * always includes the point-balance tree.
 */
function enumerateStructures(items: ImageType[]): AbstractNode[] {
  if (items.length <= 1) return [{ kind: 'leaf', img: items[0]! }];
  if (items.length === 2) {
    return [
      {
        kind: 'merge',
        left: { kind: 'leaf', img: items[0]! },
        right: { kind: 'leaf', img: items[1]! },
      },
    ];
  }
  return items.length <= N_FULL ? enumerateFullShapes(items) : enumerateBoundedShapes(items);
}

// =============================================================================
// Direction assignment and scoring
// =============================================================================

/** One candidate direction assignment for a subtree, with its resulting AR. */
interface Candidate {
  component: AtomicComponent;
  ar: number;
}

/** A row is never taller than wide, so its AR has a hard floor at 1.0. */
const ROW_AR_FLOOR = 1.0;

/**
 * AR cost, used both by the Stage-1 estimator (pickRootAssignment) and by the Stage-2
 * fallback ranking (pickBestComposition's arClosest): sub-floor candidates get a large
 * penalty (preferred only as a last resort); at or above the floor, the candidate
 * closest to the target wins.
 */
function rowARCost(rowAR: number, target: number): number {
  if (rowAR < ROW_AR_FLOOR) return 1000 + (ROW_AR_FLOOR - rowAR);
  return Math.abs(rowAR - Math.max(target, ROW_AR_FLOOR));
}

// =============================================================================
// Area-to-value selection
// =============================================================================

// =============================================================================
// PINNED-HEIGHT COMPOSITION
// =============================================================================

/**
 * Affine height model of a composition: rendered height at width W is `a·W + b`.
 *
 * The same model `computeHeightCoeffs` gives the sizer — both are adapters onto the shared
 * core in `affineHeight.ts`, so the formulas can no longer drift; this walk owns only the
 * `AtomicComponent` traversal and the leaf accessors (`getPinnedHeight`, `numericAR` — the
 * scoring-time AR chain). It exists because a pinned block has no aspect ratio: its AR is
 * `W / pinnedHeight`, a function of the width it is given, so the scalar `numericAR` the
 * rest of this file reasons in is simply a lie for it — and a consequential one. A stack of
 * two 600×1100 panels scores as AR 0.273, which drops the row below {@link ROW_AR_FLOOR}
 * and gets it rejected before anything else is considered. That is why "put Roles under
 * Messages" was unreachable.
 *
 * Both combine rules degenerate to the pure-AR forms when nothing is pinned and `gap` is 0:
 * `1/a` for an hPair is `ARleft + ARright`, and for a vStack the harmonic form. So this is
 * the same function the file already used, with the `b` term no longer forced to zero.
 *
 * Exported for `tests/utils/affineHeight.mirror.test.ts`; production callers are all here.
 */
export function heightModel(component: AtomicComponent, gap: number): AffineHeight {
  if (component.type === 'single') {
    const pinned = getPinnedHeight(component.img.source);
    if (pinned !== undefined) return pinnedLeaf(pinned);
    return flexibleLeaf(component.img.numericAR);
  }

  const left = heightModel(component.children[0], gap);
  const right = heightModel(component.children[1], gap);
  return component.direction === 'H'
    ? combineHorizontal(left, right, gap)
    : combineVertical(left, right, gap);
}

/** Aspect ratio a composition actually renders at a given row width. */
function renderedAR(component: AtomicComponent, width: number, gap: number): number {
  const height = heightAt(heightModel(component, gap), width);
  return height > 0 ? width / height : 1;
}

/**
 * Declared aspect ratio of a composition, from its leaves' `numericAR` (hPair sums,
 * vStack takes the harmonic form). For a pinned block the leaf AR is the declared
 * width/height — a statement of shape preference, not of rendered geometry — which is
 * exactly what an all-pinned width split needs: heights give it no equation, so the
 * declared shapes are the only honest basis for sharing the width.
 */
function declaredComponentAR(component: AtomicComponent): number {
  if (component.type === 'single') return component.img.numericAR;
  const left = declaredComponentAR(component.children[0]);
  const right = declaredComponentAR(component.children[1]);
  return component.direction === 'H'
    ? combineDeclaredARHorizontal(left, right)
    : combineDeclaredARVertical(left, right);
}

/** Mirror of the sizer's `subtreeMinWidth`: side-by-side needs both, a stack shares one. */
function subtreeMinWidthAC(component: AtomicComponent): number {
  if (component.type === 'single') return getMinWidth(component.img.source) ?? 0;
  const left = subtreeMinWidthAC(component.children[0]);
  const right = subtreeMinWidthAC(component.children[1]);
  return component.direction === 'H'
    ? combineMinWidthHorizontal(left, right)
    : combineMinWidthVertical(left, right);
}

/**
 * Width the left child of an hPair receives — the sizer's equal-height solve, same guards.
 *
 * MUST stay behaviour-identical to `solveHboxSplit` in `rowStructureAlgorithm.ts`: this model
 * is how compositions are scored, that solve is how the winner renders, and any divergence
 * makes the search reject arrangements the renderer would have handled (a flat row of three
 * pinned bars once scored as starved at width/2 splits while the renderer's min-width band
 * rendered it legally — so a pocketed stack won by forfeit). Both now delegate to the one
 * {@link solveEqualHeightSplit}; what each adapter still owns is its tree walk and its leaf
 * accessors, and `tests/utils/affineHeight.mirror.test.ts` pins that residual agreement.
 *
 * Takes the FULL parent width and spends the dividing gap itself (the sizer's takes
 * width-minus-gap; the conventions are normalized here, inside the adapters). Exported for
 * the mirror test; production callers are all in this file.
 */
export function splitLeftWidth(component: AtomicComponent, width: number, gap: number): number {
  if (component.type === 'single') return width;
  return solveEqualHeightSplit({
    left: heightModel(component.children[0], gap),
    right: heightModel(component.children[1], gap),
    availableWidth: width - gap,
    leftDeclaredAR: declaredComponentAR(component.children[0]),
    rightDeclaredAR: declaredComponentAR(component.children[1]),
    leftMinWidth: subtreeMinWidthAC(component.children[0]),
    rightMinWidth: subtreeMinWidthAC(component.children[1]),
  });
}

/**
 * Blank area, in px², that a composition leaves inside its own bounding box.
 *
 * Only a pinned block can produce any: every flexible subtree is stretched to its siblings by
 * the equal-height solve, so a row of photographs scores exactly 0 here. A pinned one cannot
 * stretch, so an hPair holding a 986px Users panel beside a 251px Messages panel genuinely
 * leaves 735px × 400px of nothing — the blank well from Zac's 2026-08-10 screenshots, which
 * until now no term in the score could see, let alone prefer to avoid.
 */
function slackArea(component: AtomicComponent, width: number, gap: number): number {
  if (component.type === 'single') {
    // Width-notch: a capped leaf handed more width than it may render leaves a blank strip
    // beside itself for its whole height — a bar spanning 773px above a 700px-capped panel is
    // the same dead space as a height pocket, rotated. Heights: a pinned leaf renders its pin;
    // an AR leaf at its capped width renders proportionally shorter.
    const maxWidth = getMaxWidth(component.img.source);
    if (maxWidth === undefined || width <= maxWidth) return 0;
    const pinnedHeight = getPinnedHeight(component.img.source);
    const renderedHeight =
      pinnedHeight ?? (component.img.numericAR > 0 ? maxWidth / component.img.numericAR : 0);
    return (width - maxWidth) * renderedHeight;
  }

  if (component.direction === 'V') {
    return (
      slackArea(component.children[0], width, gap) + slackArea(component.children[1], width, gap)
    );
  }

  const available = width - gap;
  const leftWidth = splitLeftWidth(component, width, gap);
  const rightWidth = available - leftWidth;
  const leftHeight = heightAt(heightModel(component.children[0], gap), leftWidth);
  const rightHeight = heightAt(heightModel(component.children[1], gap), rightWidth);
  const rowHeight = Math.max(leftHeight, rightHeight);

  return (
    (rowHeight - leftHeight) * leftWidth +
    (rowHeight - rightHeight) * rightWidth +
    slackArea(component.children[0], leftWidth, gap) +
    slackArea(component.children[1], rightWidth, gap)
  );
}

/** {@link slackArea} as a fraction of the row's bounding box, so it is scale-free. */
function slackFraction(component: AtomicComponent, width: number, gap: number): number {
  const boundingArea = heightAt(heightModel(component, gap), width) * width;
  if (!(boundingArea > 0)) return 0;
  return slackArea(component, width, gap) / boundingArea;
}

/**
 * Weight on {@link slackFraction}. It never has to outrank a hard constraint — {@link
 * violationCount} is compared ahead of the whole score, so a composition that fills its box
 * beautifully but squeezes a panel below its legible width loses no matter what this is. It only
 * has to beat `equitySpread`'s usual low single digits, so that filling the row is what decides
 * among arrangements that all fit.
 */
const SLACK_WEIGHT = 10;

/**
 * Width, in px, a composition actually spans once each leaf's {@link Content.maxWidth} clamp is
 * applied — the sizer clamps a leaf to `min(assigned, maxWidth)` at render time and the width it
 * declines is simply GONE from the row (nothing re-solves to absorb it). `rowWidth −
 * consumedWidth` is therefore the blank strip Zac's review flagged at the row's right edge: the
 * arrangement asked a capped column to carry more width than its members may render.
 *
 * A vStack consumes what its widest member can use; an hPair consumes both sides plus its gap.
 * Leaves without a cap consume everything they are given, so photo rows always consume exactly
 * their row width and this measures 0.
 */
function consumedWidth(component: AtomicComponent, width: number, gap: number): number {
  if (component.type === 'single') {
    const maxWidth = getMaxWidth(component.img.source);
    return maxWidth === undefined ? width : Math.min(width, maxWidth);
  }
  if (component.direction === 'V') {
    // Stacked members SHARE one width — the atomic-design default (Zac's round-3 review: three
    // vertically-joined panels "should just adhere to the same width"). A column therefore
    // consumes only what EVERY member can render: its most-constrained member caps the column.
    return Math.min(
      consumedWidth(component.children[0], width, gap),
      consumedWidth(component.children[1], width, gap)
    );
  }
  const leftWidth = splitLeftWidth(component, width, gap);
  const rightWidth = width - gap - leftWidth;
  return (
    consumedWidth(component.children[0], leftWidth, gap) +
    gap +
    consumedWidth(component.children[1], rightWidth, gap)
  );
}

/**
 * Fill tolerance, in gaps, on {@link consumedWidth}: a composition leaving no more than 2.5 grid
 * gaps (32px) of unconsumed row width still counts as filling the body. Past it, the row reads as
 * failing to span the page.
 *
 * Measured over the admin hub's 8 collapse states × 9 desktop widths (742.4 → 1274.4) × 7 cover
 * shapes — 787 rows, covers being the one input that comes from live data and moves the geometry:
 *
 * - 778 of 787 rows consume their width **exactly**; slack is not a gradient the tolerance sits
 *   somewhere along, it is a rare artifact of a capped column that cannot use what it is handed.
 * - The worst row we accept leaves **23.31px (1.82 gaps)** — three portrait covers at 1100px with
 *   Roles collapsed. The approved live-cover layout (all-open at 1274.4) leaves 21.42px.
 * - 2.5 gaps clears that worst case by 8.7px, ~37%, which is the margin covering cover shapes
 *   this sweep did not enumerate.
 *
 * The number is unchanged from when it was first set; its BASIS is not. It used to be calibrated
 * against this model's 29px estimate of a 21.4px rendered gap — a 35% modeling error sitting
 * inside the very constant that defines "fills the body". `subtreeMaxWidth` in
 * `rowStructureAlgorithm.ts` was dropping the gap between capped hbox siblings that this function
 * charges; with the two reconciled, model slack and rendered slack now agree to the pixel on all
 * 787 rows, and the tolerance is calibrated against a measurement rather than an estimate.
 */
const FILL_TOLERANCE_GAPS = 2.5;

/**
 * How many separate columns a composition scatters its pinned leaves across, minus one — 0 when
 * every pinned block sits in one contiguous stacked run. Pinned blocks on this site are the
 * admin panels, which are one semantic group; splitting them across columns reads as scattered
 * chrome (Zac's round-3 review of two collapsed bars: "just put them all in one top to bottom
 * list, below 'users'. why wouldn't we?!"). A vStack merges its children's runs; an hPair keeps
 * them apart.
 */
function pinnedClusterCount(component: AtomicComponent): number {
  if (component.type === 'single') {
    return getPinnedHeight(component.img.source) !== undefined ? 1 : 0;
  }
  const left = pinnedClusterCount(component.children[0]);
  const right = pinnedClusterCount(component.children[1]);
  if (component.direction === 'H') return left + right;
  return left > 0 && right > 0 ? left + right - 1 : left + right;
}

/**
 * Weight per extra pinned column. Sits between `equitySpread`'s usual low single digits and the
 * hard 1000-class penalties: strong enough that among CLEAN arrangements the one keeping the
 * panels in a single column wins, never strong enough to force a starving or non-filling row.
 */
const PINNED_SCATTER_WEIGHT = 4;

/**
 * Weight of the AR-target term in the equity-primary score. Small, so equitySpread
 * (area tracks prominence) dominates and the AR-target only breaks ties among
 * near-equity options. Replaces the retired AR_EQUITY_BAND gate.
 */
const LAMBDA = 0.15;

/**
 * Soft upper bound on row AR, as a multiple of the row's target. A row wider than
 * CEILING_MULT × target is rejected (mirror of the hard lower floor), so equity
 * cannot collapse a horizontal row into a thin strip. A ceiling rather than a larger
 * LAMBDA, which would over-square vertical-hero rows.
 */
const CEILING_MULT = 2.0;

/**
 * Scale-symmetric AR distance |ln(rowAR / target)|: being 2× too wide and 2× too tall
 * cost the same. The hard floor and CEILING_MULT ceiling carry the asymmetric
 * constraints; this term is a pure closeness-to-target pull.
 */
function arPenalty(rowAR: number, target: number): number {
  const safeTarget = Math.max(target, ROW_AR_FLOOR);
  return Math.abs(Math.log(rowAR / safeTarget));
}

/**
 * Relative area of each leaf (and its prominence) for a fully direction-assigned
 * subtree. Area splits geometrically: hPair ∝ AR, vStack ∝ 1/AR; leaf shares sum to 1
 * within the subtree. `value` is prominence P, so equitySpread rewards high-rated
 * verticals with more area.
 *
 * vStack inverts: leftFactor uses rightAR (and vice versa) — under 1/AR the smaller-AR
 * child claims the larger share.
 */
function leafShares(component: AtomicComponent): {
  ar: number;
  leaves: Array<{ value: number; share: number }>;
} {
  if (component.type === 'single') {
    return { ar: component.img.numericAR, leaves: [{ value: component.img.prominence, share: 1 }] };
  }
  const left = leafShares(component.children[0]);
  const right = leafShares(component.children[1]);
  const leftAR = left.ar;
  const rightAR = right.ar;
  const sum = leftAR + rightAR;
  const isH = component.direction === 'H';
  const ar = isH ? sum : (leftAR * rightAR) / sum;
  const leftFactor = isH ? leftAR / sum : rightAR / sum;
  const rightFactor = isH ? rightAR / sum : leftAR / sum;
  return {
    ar,
    leaves: [
      ...left.leaves.map(leaf => ({ value: leaf.value, share: leaf.share * leftFactor })),
      ...right.leaves.map(leaf => ({ value: leaf.value, share: leaf.share * rightFactor })),
    ],
  };
}

/**
 * How unevenly a candidate sizes its images relative to prominence:
 * max(area/value) / min(area/value) across leaves. 1.0 = perfectly proportional;
 * larger is worse. Uses prominence P so high-rated verticals are not penalized.
 */
function equitySpread(component: AtomicComponent): number {
  const { leaves } = leafShares(component);
  let min = Infinity;
  let max = 0;
  for (const { value, share } of leaves) {
    if (value <= 0) continue;
    const ratio = share / value;
    if (ratio < min) min = ratio;
    if (ratio > max) max = ratio;
  }
  return min > 0 && min !== Infinity ? max / min : 1;
}

/**
 * Every direction-assigned AtomicComponent for a subtree: one candidate per leaf, an
 * hPair and a vStack at each internal node, multiplied across nesting. Cost is 2^N in
 * the number of internal nodes, bounded by row size.
 *
 * The two AR forms: hPair adds (ar = leftAR + rightAR), vStack takes the harmonic form
 * (1/ar = 1/leftAR + 1/rightAR), written here as product-over-sum — equivalent on the positive
 * finite ARs that reach here, but not in general; see `combineDeclaredARVertical` in
 * `affineHeight.ts` for the cases where the two spellings part company.
 */
function enumerateAssignments(node: AbstractNode): Candidate[] {
  if (node.kind === 'leaf') {
    return [{ component: single(node.img), ar: node.img.numericAR }];
  }
  const leftOptions = enumerateAssignments(node.left);
  const rightOptions = enumerateAssignments(node.right);
  const out: Candidate[] = [];
  for (const leftOption of leftOptions) {
    for (const rightOption of rightOptions) {
      out.push(
        {
          component: hPair(leftOption.component, rightOption.component),
          ar: leftOption.ar + rightOption.ar,
        },
        {
          component: vStack(leftOption.component, rightOption.component),
          ar: (leftOption.ar * rightOption.ar) / (leftOption.ar + rightOption.ar),
        }
      );
    }
  }
  return out;
}

/**
 * AR-closest direction assignment for a single point-balance tree — the cheap Stage-1
 * estimator behind estimateRowAR. The root is forced hPair (rows are horizontal);
 * among the children's assignments the lowest rowARCost wins. No equity search here;
 * that runs only at final composition.
 */
function pickRootAssignment(tree: AbstractNode, targetAR: number): AtomicComponent {
  if (tree.kind === 'leaf') return single(tree.img);

  const leftOptions = enumerateAssignments(tree.left);
  const rightOptions = enumerateAssignments(tree.right);

  let best: AtomicComponent | null = null;
  let bestArCost = Infinity;
  for (const leftOption of leftOptions) {
    for (const rightOption of rightOptions) {
      const arCost = rowARCost(leftOption.ar + rightOption.ar, targetAR);
      if (arCost < bestArCost) {
        bestArCost = arCost;
        best = hPair(leftOption.component, rightOption.component);
      }
    }
  }
  return best!;
}

/**
 * Equity-primary composition across every candidate shape and every root-hPair
 * direction assignment. Rejects rows below the AR floor (1.0) or above the ceiling
 * (CEILING_MULT × target); among survivors, candidates are ordered lexicographically by
 * `(violations, score, arDist)` — {@link violationCount} first, then
 * equitySpread + LAMBDA · arPenalty(rowAR, target) and friends, then closeness to target.
 * Falls back to the AR-closest candidate (then a flat hChain) only if nothing lands in
 * band. `counters`, when passed, records shapes/candidates for the perf-guard test.
 *
 * When — and only when — a member declares a {@link Content.minWidth} and the caller
 * threaded a finite {@link PixelContext}, starvation can be measured at all, which
 * makes the choice of arrangement width-dependent for this row. Rearrangement alone
 * cannot always satisfy a minimum (the root is a forced hPair, so n leaves always split
 * one width n ways); {@link buildRows}' membership guard is what frees up the width, and
 * this only spends what it is given as well as possible.
 */
function pickBestComposition(
  items: ImageType[],
  targetAR: number,
  counters?: { shapes: number; candidates: number },
  pixelContext?: PixelContext
): AtomicComponent {
  const shapes = enumerateStructures(items);
  if (counters) counters.shapes += shapes.length;
  const target = Math.max(targetAR, ROW_AR_FLOOR);
  const ceiling = CEILING_MULT * target;

  // Every pixel-aware term below is gated on this. Finite, not merely present: a NaN or Infinity
  // width poisons every arithmetic term it touches, and NaN comparisons are all false, so a
  // single bad pixel would silently hand the row to whichever candidate happened to be scored
  // first. Unitless scoring is the honest fallback when the caller has no usable pixels — it is
  // what every collection page runs anyway.
  const hasPixels =
    pixelContext !== undefined &&
    Number.isFinite(pixelContext.componentWidth) &&
    Number.isFinite(pixelContext.gap);
  const rowPixels = hasPixels ? pixelContext.componentWidth : 0;
  const rowGap = hasPixels ? pixelContext.gap : 0;

  // One O(n) precheck, hoisted above the candidate loops: false for every collection
  // page, and then `consider` below scores exactly what it scored pre-feature.
  const constrained = hasPixels && items.some(img => getMinWidth(img.source) !== undefined);

  // Second O(n) precheck, same shape as `constrained`. A pinned member makes the enumeration's
  // scalar AR wrong (its real AR is width/pinnedHeight), so the two terms below switch to the
  // rendered-height model. No photograph declares a pin, so this is false for every collection
  // page and `consider` scores exactly what it scored pre-feature.
  const pinned = hasPixels && items.some(img => getPinnedHeight(img.source) !== undefined);

  // Third precheck, same discipline: no photograph declares a maxWidth, so the fill term below
  // is identically 0 for every collection page.
  const capped = hasPixels && items.some(img => getMaxWidth(img.source) !== undefined);
  const fillTolerance = FILL_TOLERANCE_GAPS * rowGap;

  let best: AtomicComponent | null = null;
  let bestViolations = Infinity;
  let bestScore = Infinity;
  let bestArDist = Infinity;
  let arClosest: AtomicComponent | null = null;
  let arClosestCost = Infinity;

  const consider = (component: AtomicComponent, enumeratedAR: number): void => {
    if (counters) counters.candidates += 1;
    const rowAR = pinned ? renderedAR(component, rowPixels, rowGap) : enumeratedAR;
    const cost = rowARCost(rowAR, target);
    if (cost < arClosestCost) {
      arClosestCost = cost;
      arClosest = component;
    }
    // The AR floor ("never taller than wide") and ceiling ("never a thin strip") are aesthetic
    // guards over a shape the composer is free to choose. A row carrying a pinned member has no
    // such freedom: its height is whatever its tallest pinned block is, near enough, so both
    // bounds stop being design choices and start vetoing arrangements for a ratio the content
    // dictates. Skipping them here is what lets the row that FILLS its box win; slack, min-width
    // and equity then decide, with `arPenalty` left as a mild pull toward the target.
    if (!pinned && (rowAR < ROW_AR_FLOOR || rowAR > ceiling)) return;
    const starvation = constrained ? minWidthDeficit(component, rowPixels, rowGap) : 0;
    const slack = pinned ? slackFraction(component, rowPixels, rowGap) : 0;
    // Same penalty class as starvation: a row that cannot span the body is invalid unless
    // every alternative is too, and then the graded term prefers the least unconsumed width.
    const unconsumed = capped ? rowPixels - consumedWidth(component, rowPixels, rowGap) : 0;
    const scatter = pinned ? Math.max(0, pinnedClusterCount(component) - 1) : 0;
    const violations = violationCount(starvation, unconsumed, fillTolerance);
    const score =
      equitySpread(component) +
      LAMBDA * arPenalty(rowAR, target) +
      SLACK_WEIGHT * slack +
      PINNED_SCATTER_WEIGHT * scatter +
      starvation +
      (unconsumed > fillTolerance ? unconsumed / rowPixels : 0);
    const arDist = Math.abs(rowAR - target);
    const better =
      violations !== bestViolations
        ? violations < bestViolations
        : score !== bestScore
          ? score < bestScore
          : arDist < bestArDist;
    if (better) {
      bestViolations = violations;
      bestScore = score;
      bestArDist = arDist;
      best = component;
    }
  };

  for (const shape of shapes) {
    if (shape.kind === 'leaf') {
      consider(single(shape.img), shape.img.numericAR);
      continue;
    }
    const leftOptions = enumerateAssignments(shape.left);
    const rightOptions = enumerateAssignments(shape.right);
    for (const leftOption of leftOptions) {
      for (const rightOption of rightOptions) {
        consider(
          hPair(leftOption.component, rightOption.component),
          leftOption.ar + rightOption.ar
        );
      }
    }
  }

  return best ?? arClosest ?? hChain(items);
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Build a row's atomic component tree, leaves in input order. Runs the multi-structure
 * equity-primary search; targetAR below ROW_AR_FLOOR (1.0) is lifted to it. The cheap
 * single-structure path backs estimateRowAR in the Stage-1 fill loop.
 *
 * The single-item short-circuit below is also the whole of min-width degradation: a lone
 * item is returned as a leaf and rendered at the full available width, whether or not
 * that clears its declared minimum. No second degrade path exists, and none is wanted —
 * solo-hero rows never reach here either.
 *
 * @param pixelContext - Rendered row width and CSS gap; supply to enforce
 *   {@link Content.minWidth}. Omitted by every caller that does not need it.
 */
export function buildAtomic(
  items: ImageType[],
  targetAR: number,
  pixelContext?: PixelContext
): AtomicComponent {
  if (items.length === 0) throw new Error('buildAtomic requires at least 1 image');
  if (items.length === 1) return single(items[0]!);

  return pickBestComposition(items, targetAR, undefined, pixelContext);
}

/**
 * Compose a row and report how many candidate shapes / direction assignments were
 * evaluated. Backs the perf-guard test (the search stays bounded). Not used in
 * production.
 */
export function composeRowWithCandidateCount(
  items: ImageType[],
  targetAR: number
): { component: AtomicComponent; shapes: number; candidates: number } {
  if (items.length <= 1) {
    return { component: single(items[0]!), shapes: 1, candidates: 1 };
  }
  const counters = { shapes: 0, candidates: 0 };
  const component = pickBestComposition(items, targetAR, counters);
  return { component, shapes: counters.shapes, candidates: counters.candidates };
}
