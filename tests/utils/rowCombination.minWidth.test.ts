/**
 * `minWidth`: a per-item pixel floor honoured at composition time.
 *
 * A photograph scales to any width; a UI panel does not. A panel that declares
 * `minWidth` tells the packer "below this many CSS px my chrome breaks", and the packer
 * answers by keeping starving row-mates OUT of the row rather than by reserving a
 * hardcoded slab of width. Three properties are load-bearing and each has a test here:
 *
 * 1. **Off by default.** Content that declares no `minWidth` lays out exactly as it did
 *    before the feature existed — same rows, same trees — whether or not the caller
 *    threads `componentWidth`/`gap`. Test (a) pins the pre-change output of a
 *    representative photo set verbatim.
 * 2. **Not its own row.** The constraint evicts row-mates; it never promotes a panel to a
 *    full-width row of its own. Test (b) has three panels share one row at desktop width.
 * 3. **Degrades, never overflows.** A lone item narrower than its own minimum takes the
 *    full width it has. Tests (c)/(e) cover the phone case the user explicitly asked not
 *    to be "restrictive on mobile".
 *
 * Test (a) passes both before and after the feature — that is the point of it: it is the
 * no-op proof, and it fails only if the feature leaks into unconstrained content.
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel, ContentPanelModel } from '@/app/types/Content';
import { type BoxTree, buildRows, type RowResult } from '@/app/utils/rowCombination';
import { calculateSizesFromBoxTree } from '@/app/utils/rowStructureAlgorithm';
import { collectBlanks } from '@/tests/fixtures/boxTreeHelpers';
import {
  createCollectionContent,
  createPanelContent,
  createPanorama,
  createParallaxContent,
  createSquareImage,
  H,
  V,
} from '@/tests/fixtures/contentFixtures';

/** Real max desktop content width: pageMaxWidth 1300 − desktopPadding 25.6. */
const DESKTOP_WIDTH = 1274.4;
const DESKTOP_ROW_WIDTH = LAYOUT.desktopSlotWidth;
const PHONE_WIDTH = 390;
const PHONE_ROW_WIDTH = LAYOUT.mobileSlotWidth;
const PANEL_MIN = 400;

function shape(tree: BoxTree): string {
  if (tree.type === 'leaf') return `L(${tree.content.id})`;
  const dir = tree.direction === 'horizontal' ? 'H' : 'V';
  return `${dir}(${shape(tree.children[0])},${shape(tree.children[1])})`;
}

const describeRows = (rows: RowResult[]): Array<{ ids: number[]; shape: string }> =>
  rows.map(row => ({ ids: row.components.map(item => item.id), shape: shape(row.boxTree) }));

const panel = (id: number, overrides?: Partial<ContentPanelModel>): ContentPanelModel =>
  createPanelContent(id, { width: 600, height: 1100, rating: 5, ...overrides });

/**
 * An admin nav tile: a parallax card whose cover has already been through
 * `clampParallaxDimensions`, so its AR is the 5:4 ceiling the hub actually packs.
 */
const tile = (id: number): AnyContentModel =>
  createParallaxContent(id, {
    slug: `tile-${id}`,
    imageWidth: 2400,
    imageHeight: 1920,
    width: 2400,
    height: 1920,
  });

const widthsById = (
  row: RowResult,
  componentWidth: number,
  gap: number,
  rowWidth: number
): Map<number, number> =>
  new Map(
    calculateSizesFromBoxTree(row.boxTree, componentWidth, gap, rowWidth).map(size => [
      size.content.id,
      size.width,
    ])
  );

// ===================== (a) no-op proof =====================

/** A representative mixed collection page: ratings 1-5, both orientations, a pano, a card. */
const PHOTOS: AnyContentModel[] = [
  H(1, 5),
  V(2, 3),
  H(3, 2),
  createPanorama(4, 5),
  V(5, 4),
  createSquareImage(6, 3),
  H(7, 4),
  H(8, 1),
  V(9, 5),
  createCollectionContent(10),
  H(11, 3),
  V(12, 2),
];

/**
 * Captured from `buildRows` on the commit before `minWidth` existed. Any change to this
 * array means unconstrained content moved, which the feature must never do.
 */
const PHOTOS_BEFORE = [
  { ids: [1, 2, 3, 5], shape: 'H(V(L(1),H(L(2),L(3))),L(5))' },
  { ids: [4], shape: 'L(4)' },
  { ids: [6, 7, 8, 9], shape: 'H(V(L(6),L(7)),V(L(8),L(9)))' },
  { ids: [10, 11, 12], shape: 'H(H(V(L(10),L(11)),L(12)),L(-1000003))' },
];

describe('minWidth — (a) no-op for content that declares none', () => {
  it('reproduces the pre-feature layout of a representative photo set', () => {
    expect(describeRows(buildRows(PHOTOS, DESKTOP_ROW_WIDTH, 1.5))).toEqual(PHOTOS_BEFORE);
  });

  it('is unchanged when the caller threads componentWidth and gap', () => {
    const short = buildRows(PHOTOS, DESKTOP_ROW_WIDTH, 1.5);
    const threaded = buildRows(PHOTOS, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);

    expect(threaded).toEqual(short);
  });

  it('is unchanged for panels that carry no minWidth, threaded or not', () => {
    const content = [panel(1001), panel(1002), panel(1003), tile(1), tile(2), tile(3)];

    expect(
      describeRows(buildRows(content, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap))
    ).toEqual(describeRows(buildRows(content, DESKTOP_ROW_WIDTH, 1.5)));
  });
});

// ===================== (b) three panels, no tiles, ≥ 400px each =====================

describe('minWidth — (b) three 400px panels at a 1274.4px content width', () => {
  const panels = [
    panel(1001, { minWidth: PANEL_MIN }),
    panel(1002, { minWidth: PANEL_MIN }),
    panel(1003, { minWidth: PANEL_MIN }),
  ];
  const content: AnyContentModel[] = [...panels, tile(1), tile(2), tile(3)];

  it('without minWidth the tiles share the panels row and squeeze it under 400px', () => {
    const plain: AnyContentModel[] = [
      panel(1001),
      panel(1002),
      panel(1003),
      tile(1),
      tile(2),
      tile(3),
    ];
    const rows = buildRows(plain, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);
    const widths = widthsById(rows[0]!, DESKTOP_WIDTH, LAYOUT.gridGap, DESKTOP_ROW_WIDTH);

    expect(rows[0]!.components.map(item => item.id)).toEqual([1001, 1002, 1003, 1, 2]);
    expect(widths.get(1001)!).toBeLessThan(PANEL_MIN);
  });

  it('puts the three panels in one row without the tiles', () => {
    const rows = buildRows(content, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);

    expect(rows[0]!.components.map(item => item.id)).toEqual([1001, 1002, 1003]);
  });

  it('renders every panel at or above its minimum', () => {
    const rows = buildRows(content, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);
    const widths = widthsById(rows[0]!, DESKTOP_WIDTH, LAYOUT.gridGap, DESKTOP_ROW_WIDTH);

    for (const id of [1001, 1002, 1003]) {
      expect(widths.get(id)!).toBeGreaterThanOrEqual(PANEL_MIN);
    }
  });

  it('does not overflow the content width', () => {
    const rows = buildRows(content, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);
    const widths = widthsById(rows[0]!, DESKTOP_WIDTH, LAYOUT.gridGap, DESKTOP_ROW_WIDTH);
    const total = [...widths.values()].reduce((sum, w) => sum + w, 0) + 2 * LAYOUT.gridGap;

    expect(total).toBeLessThanOrEqual(DESKTOP_WIDTH + 0.01);
  });

  it('still lays out the evicted tiles, in order, on later rows', () => {
    const rows = buildRows(content, DESKTOP_ROW_WIDTH, 1.5, DESKTOP_WIDTH, LAYOUT.gridGap);
    const laterIds = rows.slice(1).flatMap(row => row.components.map(item => item.id));

    expect(laterIds).toEqual([1, 2, 3]);
  });
});

// ===================== (c) degrade below the minimum, never overflow =====================

describe('minWidth — (c) a lone panel narrower than its own minimum', () => {
  it('takes the full 390px phone width rather than 400px or an overflow', () => {
    const rows = buildRows(
      [panel(1001, { minWidth: PANEL_MIN })],
      PHONE_ROW_WIDTH,
      1.5,
      PHONE_WIDTH,
      LAYOUT.mobileGridGap
    );

    expect(rows).toHaveLength(1);
    const widths = widthsById(rows[0]!, PHONE_WIDTH, LAYOUT.mobileGridGap, PHONE_ROW_WIDTH);
    expect(widths.get(1001)).toBe(PHONE_WIDTH);
  });
});

// ===================== (d) padRowToWidth =====================

describe('minWidth — (d) blank padding', () => {
  const PAD_WIDTH = 600;

  it('pads an unconstrained panel row, shrinking the panel well below 400px', () => {
    const rows = buildRows([panel(1001)], PHONE_ROW_WIDTH, 1.5, PAD_WIDTH, LAYOUT.gridGap);
    const widths = widthsById(rows[0]!, PAD_WIDTH, LAYOUT.gridGap, PHONE_ROW_WIDTH);

    expect(collectBlanks(rows[0]!.boxTree)).toHaveLength(1);
    expect(widths.get(1001)!).toBeLessThan(PANEL_MIN);
  });

  it('never shrinks a min-width member below its minimum', () => {
    const rows = buildRows(
      [panel(1001, { minWidth: PANEL_MIN })],
      PHONE_ROW_WIDTH,
      1.5,
      PAD_WIDTH,
      LAYOUT.gridGap
    );
    const widths = widthsById(rows[0]!, PAD_WIDTH, LAYOUT.gridGap, PHONE_ROW_WIDTH);

    expect(collectBlanks(rows[0]!.boxTree)).toHaveLength(0);
    expect(widths.get(1001)).toBe(PAD_WIDTH);
  });
});

// ===================== (e) mobile is not restrictive =====================

describe('minWidth — (e) three 400px panels on a 390px phone', () => {
  it('gives each panel its own full-width row instead of overflowing', () => {
    const content: AnyContentModel[] = [
      panel(1001, { minWidth: PANEL_MIN }),
      panel(1002, { minWidth: PANEL_MIN }),
      panel(1003, { minWidth: PANEL_MIN }),
      tile(1),
    ];
    const rows = buildRows(content, PHONE_ROW_WIDTH, 1.5, PHONE_WIDTH, LAYOUT.mobileGridGap);

    for (const id of [1001, 1002, 1003]) {
      const row = rows.find(candidate => candidate.components.some(item => item.id === id))!;
      expect(row.components).toHaveLength(1);
      expect(widthsById(row, PHONE_WIDTH, LAYOUT.mobileGridGap, PHONE_ROW_WIDTH).get(id)).toBe(
        PHONE_WIDTH
      );
    }
  });
});
