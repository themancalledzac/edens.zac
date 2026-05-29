/**
 * Unit tests for layoutTrace.ts — tree helpers + buildLayoutTrace shape.
 */

import { buildLayoutTrace, treeShape, vTierOfTree, walkLeaves } from '@/app/utils/layoutTrace';
import { type BoxTree, type TemplateKey } from '@/app/utils/rowCombination';
import { H, V } from '@/tests/fixtures/contentFixtures';

// Small fixture builders for BoxTree shapes the optimizer can emit.
const leaf = (content: ReturnType<typeof H>): BoxTree => ({ type: 'leaf', content });
const h = (left: BoxTree, right: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'horizontal',
  children: [left, right],
});
const v = (top: BoxTree, bottom: BoxTree): BoxTree => ({
  type: 'combined',
  direction: 'vertical',
  children: [top, bottom],
});

describe('treeShape', () => {
  it('renders a leaf as L<id>', () => {
    expect(treeShape(leaf(H(7, 3)))).toBe('L7');
  });

  it('renders nested h/v shape with leaf ids', () => {
    const tree = h(leaf(H(1, 4)), v(leaf(H(2, 3)), leaf(H(3, 3))));
    expect(treeShape(tree)).toBe('h(L1,v(L2,L3))');
  });
});

describe('walkLeaves', () => {
  it('returns leaves in left-to-right order', () => {
    const a = H(1, 4);
    const b = H(2, 3);
    const c = H(3, 3);
    const tree = h(leaf(a), v(leaf(b), leaf(c)));
    expect(walkLeaves(tree)).toEqual([a, b, c]);
  });
});

describe('vTierOfTree', () => {
  it('returns 1 for a leaf', () => {
    expect(vTierOfTree(leaf(H(1, 3)))).toBe(1);
  });

  it('returns max(children) for an hPair', () => {
    const tree = h(leaf(H(1, 3)), v(leaf(H(2, 3)), leaf(H(3, 3))));
    expect(vTierOfTree(tree)).toBe(2);
  });

  it('returns sum(children) for a vStack', () => {
    const tree = v(leaf(H(1, 3)), v(leaf(H(2, 3)), leaf(H(3, 3))));
    expect(vTierOfTree(tree)).toBe(3);
  });
});

describe('buildLayoutTrace', () => {
  const templateKey: TemplateKey = { h: 3, v: 0 };

  it('produces a single trace object with the expected top-level shape', () => {
    const a = H(1, 4);
    const b = H(2, 3);
    const c = H(3, 3);
    const content = [a, b, c];

    const trace = buildLayoutTrace({
      content,
      rows: [
        {
          templateKey,
          items: [{ content: a }, { content: b }, { content: c }],
          boxTree: h(h(leaf(a), leaf(b)), leaf(c)),
        },
      ],
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
    });

    expect(trace.page).toMatchObject({
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
      totalItems: 3,
      totalRows: 1,
    });
    expect(trace.originalOrder.map(it => it.idx)).toEqual([0, 1, 2]);
    expect(trace.rows).toHaveLength(1);
    expect(trace.rows[0]!.isLastRow).toBe(true);
    expect(trace.rows[0]!.treeShape).toBe('h(h(L1,L2),L3)');
    expect(trace.rows[0]!.itemCount).toBe(3);
    expect(trace.rows[0]!.templateKey).toBe('3h-0v');
  });

  it('reports zero displacement when tree order matches input order', () => {
    const a = H(1, 4);
    const b = H(2, 3);
    const trace = buildLayoutTrace({
      content: [a, b],
      rows: [
        {
          templateKey,
          items: [{ content: a }, { content: b }],
          boxTree: h(leaf(a), leaf(b)),
        },
      ],
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
    });

    expect(trace.rows[0]!.swapBudget).toEqual({ maxDisplacement: 0, totalDisplacement: 0 });
    expect(trace.rows[0]!.items.map(it => it.displacement)).toEqual([0, 0]);
  });

  it('reports displacement {max: 1, total: 2} when two adjacent leaves swap', () => {
    // Input order: a, b. Tree leaf order: b, a → each item moves by 1.
    const a = H(1, 4);
    const b = H(2, 3);
    const trace = buildLayoutTrace({
      content: [a, b],
      rows: [
        {
          templateKey,
          items: [{ content: a }, { content: b }],
          boxTree: h(leaf(b), leaf(a)),
        },
      ],
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
    });

    expect(trace.rows[0]!.swapBudget).toEqual({ maxDisplacement: 1, totalDisplacement: 2 });
    expect(trace.rows[0]!.leafOrder).toEqual([2, 1]);
  });

  it('skips header rows and marks the last content row as isLastRow', () => {
    const a = H(1, 4);
    const b = H(2, 3);
    const c = H(3, 3);

    const trace = buildLayoutTrace({
      content: [a, b, c],
      rows: [
        // header row should be filtered out
        { templateKey: 'header' as const, items: [{ content: a }], boxTree: leaf(a) },
        { templateKey, items: [{ content: a }, { content: b }], boxTree: h(leaf(a), leaf(b)) },
        { templateKey, items: [{ content: c }], boxTree: leaf(c) },
      ],
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
    });

    expect(trace.rows).toHaveLength(2);
    expect(trace.rows[0]!.isLastRow).toBe(false);
    expect(trace.rows[1]!.isLastRow).toBe(true);
    expect(trace.page.totalRows).toBe(2);
  });

  it('computes vTier, sumCv, fillRatio, and maxEffRating from leaves', () => {
    const a = H(1, 4); // effRating 4
    const b = V(2, 5); // vertical 5★ → effRating 4
    const trace = buildLayoutTrace({
      content: [a, b],
      rows: [
        {
          templateKey: { h: 1, v: 1 } as TemplateKey,
          items: [{ content: a }, { content: b }],
          boxTree: h(leaf(a), leaf(b)),
        },
      ],
      componentWidth: 1600,
      rowWidth: 8,
      targetAR: 1.5,
      layoutVersion: 'v2',
      isMobile: false,
    });

    const row = trace.rows[0]!;
    expect(row.vTier).toBe(1); // pure hPair of leaves
    expect(row.maxEffRating).toBe(4);
    expect(row.sumCv).toBeGreaterThan(0);
    // fillRatio and sumCv are rounded independently — close to within 1e-2 is fine.
    expect(row.fillRatio).toBeCloseTo(row.sumCv / 8, 2);
  });
});
