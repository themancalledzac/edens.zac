/**
 * Unit tests for the pure helpers extracted from the content Component.
 */

import {
  buildContentRows,
  computeFirstNonVisibleRowIndex,
  computeTargetAspectRatio,
  createSimpleBoxTree,
  type EffectiveViewport,
  excludeFailedImages,
  resolveEffectiveViewport,
} from '@/app/components/Content/componentUtils';
import { type ViewportDimensions } from '@/app/hooks/useViewport';
import { type CalculatedContentSize, type RowWithPatternAndSizes } from '@/app/utils/contentLayout';
import { createImageContent, createTextContent } from '@/tests/fixtures/contentFixtures';

const TOL = 64;

const measured = (overrides: Partial<ViewportDimensions> = {}): ViewportDimensions => ({
  width: 1280,
  viewportHeight: 800,
  isMobile: false,
  contentWidth: 1254,
  ...overrides,
});

const sizeItem = (id: number, visible = true): CalculatedContentSize => ({
  content: createImageContent(id, { visible }),
  width: 100,
  height: 100,
});

const row = (items: CalculatedContentSize[]): RowWithPatternAndSizes => ({
  rowType: 'content',
  items,
  boxTree: createSimpleBoxTree(items),
});

describe('resolveEffectiveViewport', () => {
  const server = { serverContentWidth: 1274, serverViewportHeight: 900, serverIsMobile: false };

  it('uses the measured viewport when the client is narrower than the SSR width', () => {
    const result = resolveEffectiveViewport(
      measured({ contentWidth: 1210, viewportHeight: 700 }),
      server,
      TOL
    );
    expect(result).toEqual<EffectiveViewport>({
      contentWidth: 1210,
      viewportHeight: 700,
      isMobile: false,
    });
  });

  it('keeps the SSR viewport when the measured width is within tolerance (not narrower)', () => {
    const result = resolveEffectiveViewport(
      measured({ contentWidth: 1274, viewportHeight: 700, isMobile: true }),
      server,
      TOL
    );
    expect(result).toEqual<EffectiveViewport>({
      contentWidth: 1274,
      viewportHeight: 900,
      isMobile: false,
    });
  });

  it('falls back to the SSR viewport before the client has measured (width 0)', () => {
    const result = resolveEffectiveViewport(measured({ contentWidth: 0 }), server, TOL);
    expect(result.contentWidth).toBe(1274);
    expect(result.viewportHeight).toBe(900);
  });

  it('uses the measured viewport when no SSR width is provided', () => {
    const result = resolveEffectiveViewport(measured({ contentWidth: 1100 }), {}, TOL);
    expect(result.contentWidth).toBe(1100);
  });

  it('recomputes to the measured width on mobile even within tolerance (full-bleed)', () => {
    // iPhone 14 Pro Max: SSR assumes 390px, the device measures 430px. The 40px gap is
    // within the 64px desktop tolerance, but mobile has no width cap and must fill the
    // viewport edge-to-edge, so it adopts the measured width instead of keeping 390.
    const mobileServer = {
      serverContentWidth: 390,
      serverViewportHeight: 844,
      serverIsMobile: true,
    };
    const result = resolveEffectiveViewport(
      measured({ contentWidth: 430, width: 430, viewportHeight: 932, isMobile: true }),
      mobileServer,
      TOL
    );
    expect(result).toEqual<EffectiveViewport>({
      contentWidth: 430,
      viewportHeight: 932,
      isMobile: true,
    });
  });

  it('keeps the SSR width on desktop when the measured width is wider within tolerance', () => {
    // Desktop guard: the anti-flash tolerance still applies off mobile, so a 26px-wider
    // measurement keeps the SSR width (no hydration reflow).
    const result = resolveEffectiveViewport(
      measured({ contentWidth: 1300, viewportHeight: 700, isMobile: false }),
      server,
      TOL
    );
    expect(result.contentWidth).toBe(1274);
  });
});

describe('computeTargetAspectRatio', () => {
  it('returns 1.5 when the viewport height is unknown', () => {
    expect(computeTargetAspectRatio(1200, 0)).toBe(1.5);
  });

  it('returns the width/height ratio within range', () => {
    expect(computeTargetAspectRatio(1000, 800)).toBeCloseTo(1.25);
  });

  it('clamps very wide ratios to 2.5 and very tall ratios to 1.0', () => {
    expect(computeTargetAspectRatio(3000, 800)).toBe(2.5);
    expect(computeTargetAspectRatio(500, 1000)).toBe(1.0);
  });
});

describe('buildContentRows', () => {
  const viewport: EffectiveViewport = { contentWidth: 1200, viewportHeight: 800, isMobile: false };

  it('returns empty rows (no error) before there is a width', () => {
    expect(
      buildContentRows([createImageContent(1)], undefined, { ...viewport, contentWidth: 0 }, 4)
    ).toEqual({
      rows: [],
      layoutError: null,
    });
  });

  it('returns empty rows (no error) when there is no content and no collection', () => {
    expect(buildContentRows([], undefined, viewport, 4)).toEqual({ rows: [], layoutError: null });
  });

  it('lays out rows for real content without error', () => {
    const result = buildContentRows(
      [createImageContent(1), createImageContent(2), createImageContent(3)],
      undefined,
      viewport,
      4
    );
    expect(result.layoutError).toBeNull();
    expect(result.rows.length).toBeGreaterThan(0);
  });
});

describe('computeFirstNonVisibleRowIndex', () => {
  it('returns -1 when there is no current collection', () => {
    expect(computeFirstNonVisibleRowIndex([row([sizeItem(1)])])).toBe(-1);
  });

  it('returns -1 for empty rows', () => {
    expect(computeFirstNonVisibleRowIndex([], 7)).toBe(-1);
  });

  it('returns the index of the first row that contains hidden content', () => {
    const rows = [row([sizeItem(1)]), row([sizeItem(2, false)]), row([sizeItem(3)])];
    expect(computeFirstNonVisibleRowIndex(rows, 7)).toBe(1);
  });

  it('returns 0 when row 0 mixes visible and hidden content', () => {
    const rows = [row([sizeItem(1), sizeItem(2, false)])];
    expect(computeFirstNonVisibleRowIndex(rows, 7)).toBe(0);
  });

  it('returns -1 when everything is visible', () => {
    const rows = [row([sizeItem(1)]), row([sizeItem(2)])];
    expect(computeFirstNonVisibleRowIndex(rows, 7)).toBe(-1);
  });
});

describe('createSimpleBoxTree', () => {
  it('returns a single leaf for one item', () => {
    const tree = createSimpleBoxTree([sizeItem(1)]);
    expect(tree.type).toBe('leaf');
  });

  it('returns one horizontal combined node for two items', () => {
    const tree = createSimpleBoxTree([sizeItem(1), sizeItem(2)]);
    expect(tree).toMatchObject({ type: 'combined', direction: 'horizontal' });
    if (tree.type === 'combined') {
      expect(tree.children).toHaveLength(2);
      expect(tree.children.every(c => c.type === 'leaf')).toBe(true);
    }
  });

  it('nests left-associatively for three items', () => {
    const tree = createSimpleBoxTree([sizeItem(1), sizeItem(2), sizeItem(3)]);
    // combined( combined(leaf, leaf), leaf )
    expect(tree.type).toBe('combined');
    if (tree.type === 'combined') {
      expect(tree.children[0]!.type).toBe('combined');
      expect(tree.children[1]!.type).toBe('leaf');
    }
  });
});

describe('excludeFailedImages', () => {
  it('returns the same array reference when no ids have failed', () => {
    const content = [createImageContent(1), createImageContent(2)];
    expect(excludeFailedImages(content, new Set())).toBe(content);
  });

  it('returns the same array reference when the failed ids match nothing', () => {
    const content = [createImageContent(1), createImageContent(2)];
    expect(excludeFailedImages(content, new Set([99]))).toBe(content);
  });

  it('removes IMAGE blocks whose id is in the failed set', () => {
    const content = [createImageContent(1), createImageContent(2), createImageContent(3)];
    const result = excludeFailedImages(content, new Set([2]));
    expect(result.map(c => c.id)).toEqual([1, 3]);
  });

  it('never removes non-IMAGE content even when its id collides with a failed id', () => {
    // A TEXT block and an IMAGE block share id 5; only the IMAGE must be dropped.
    const content = [createTextContent(5), createImageContent(5)];
    const result = excludeFailedImages(content, new Set([5]));
    expect(result.map(c => c.contentType)).toEqual(['TEXT']);
  });
});
