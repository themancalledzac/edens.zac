/**
 * Direct tests for the layout ruler.
 *
 * `measureRow` is the instrument `page.collapseStates.test.ts` measures the fill invariants with
 * and the one `Component.tsx` logs to the development console, and until now nothing measured IT.
 * That is the wrong way round for a ruler: it walks a BoxTree against a separate array of sized
 * items, and if the two disagree it used to substitute a 0×0 leaf and carry on — reporting a row
 * NARROWER and SHORTER than it renders, which is the direction that makes a span-the-body
 * assertion pass and a pocket assertion pass. So the mismatch paths are pinned here first.
 */
import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { describeLayoutRows, measureRow } from '@/app/utils/layoutDebug';
import type { BoxTree } from '@/app/utils/rowCombination';
import { createImageContent, createPanelContent } from '@/tests/fixtures/contentFixtures';

const GAP = LAYOUT.gridGap;

const leaf = (content: AnyContentModel): BoxTree => ({ type: 'leaf', content });
const hbox = (a: BoxTree, b: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'horizontal',
  children: [a, b],
});
const vbox = (a: BoxTree, b: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'vertical',
  children: [a, b],
});

const sized = (content: AnyContentModel, width: number, height: number) => ({
  content,
  width,
  height,
});

const one = createImageContent(1);
const two = createImageContent(2);
const three = createImageContent(3);

describe('measureRow', () => {
  /**
   * The whole model in one row: an hbox spans `left + gap + right`, a vbox stacks to
   * `top + gap + bottom` and is only as wide as its widest member, and a column that reaches the
   * row's full height leaves nothing over. 400 + 12.8 + 200 across, 200 tall both sides.
   */
  it('measures a nested row: hbox spans across, vbox stacks, no pocket when columns agree', () => {
    const m = measureRow({
      boxTree: hbox(leaf(one), vbox(leaf(two), leaf(three))),
      items: [sized(one, 400, 200), sized(two, 200, 100), sized(three, 200, 87.2)],
    });

    expect(m.spanPx).toBeCloseTo(612.8, 6);
    expect(m.heightPx).toBeCloseTo(200, 6);
    expect(m.pocketPx2).toBeCloseTo(0, 6);
    expect(m.structure).toBe('H(image:Image 1, V(image:Image 2, image:Image 3))');
  });

  /** The blank area the fill rules exist to close: a short column under a taller sibling. */
  it('reports the blank area beside a column shorter than its row', () => {
    const m = measureRow({
      boxTree: hbox(leaf(one), leaf(two)),
      items: [sized(one, 400, 200), sized(two, 200, 150)],
    });

    expect(m.heightPx).toBeCloseTo(200, 6);
    expect(m.pocketPx2).toBeCloseTo(50 * 200, 6);
  });

  it('labels a panel leaf by its panel type', () => {
    const users = createPanelContent(1, { panelType: 'users' });
    const m = measureRow({ boxTree: leaf(users), items: [sized(users, 400, 300)] });

    expect(m.structure).toBe('panel:users');
  });

  it('measures a tree-less rail as its items laid end to end', () => {
    const m = measureRow({ items: [sized(one, 400, 200), sized(two, 200, 150)] });

    expect(m.spanPx).toBeCloseTo(600, 6);
    expect(m.heightPx).toBeCloseTo(200, 6);
    expect(m.pocketPx2).toBe(0);
    expect(m.structure).toBe('rail');
  });

  it('uses the shipped grid gap by default and the caller’s gap when given one', () => {
    const row = {
      boxTree: hbox(leaf(one), leaf(two)),
      items: [sized(one, 400, 200), sized(two, 200, 200)],
    };

    expect(measureRow(row).spanPx).toBeCloseTo(600 + GAP, 6);
    expect(measureRow(row, 40).spanPx).toBeCloseTo(640, 6);
  });

  /**
   * A tree with more leaves than the row has sizes. The old code handed the walk a 0×0 leaf, so
   * this row measured 400px wide instead of 612.8 — a 212.8px understatement, in the direction
   * that makes "spans the body" pass.
   */
  it('refuses to measure a row whose tree has more leaves than the row has items', () => {
    expect(() =>
      measureRow({ boxTree: hbox(leaf(one), leaf(two)), items: [sized(one, 400, 200)] })
    ).toThrow(/more leaves than the row's 1 sized item/);
  });

  /** The other direction: sizes the tree never reaches, whose width vanishes from `spanPx`. */
  it('refuses to measure a row carrying items its tree never reaches', () => {
    expect(() =>
      measureRow({ boxTree: leaf(one), items: [sized(one, 400, 200), sized(two, 200, 200)] })
    ).toThrow(/1 leaves but the row carries 2 sized items/);
  });
});

describe('describeLayoutRows', () => {
  it('describes each row with its span, height, edge gap, pocket, structure and leaf sizes', () => {
    const [line] = describeLayoutRows(
      [
        {
          boxTree: hbox(leaf(one), leaf(two)),
          items: [sized(one, 400, 200), sized(two, 200, 150)],
        },
      ],
      800
    );

    expect(line).toBe(
      'row 0: 612.8×200.0 edgeGap=187.2 pocket=10.0k | H(image:Image 1, image:Image 2) | 400×200 200×150'
    );
  });

  /**
   * The one caller is a development-only `useEffect`. A diagnostic must not be able to crash the
   * page it is diagnosing, so an unmeasurable row becomes a loud line instead of an exception —
   * and the rows around it still report.
   */
  it('reports an unmeasurable row as a line instead of throwing, and keeps describing the rest', () => {
    const lines = describeLayoutRows([
      { boxTree: hbox(leaf(one), leaf(two)), items: [sized(one, 400, 200)] },
      { boxTree: leaf(one), items: [sized(one, 400, 200)] },
    ]);

    expect(lines[0]).toMatch(/^row 0: UNMEASURABLE — measureRow: /);
    expect(lines[1]).toContain('image:Image 1');
  });
});
