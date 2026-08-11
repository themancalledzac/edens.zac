/**
 * Layout introspection: turns packed rows into compact, human-readable structure lines and the
 * measurements behind them. Two consumers, one source of truth:
 *
 * - `Component.tsx` logs every packed page to the browser console in development, so a layout
 *   question starts from "what did the packer actually build" instead of DOM archaeology
 *   (Zac's 0246 round-3 ask: automatic width/height/structure logging per row).
 * - The admin collapse-state tests assert on these same measurements, so the invariant the
 *   console shows is the invariant CI enforces.
 *
 * `spanPx` is the width the row's content actually renders across (leaf widths + gaps through
 * the tree); `contentWidth − spanPx` is the dead strip at the row's right edge. `pocketPx2` is
 * blank area INSIDE the row: height mismatch between side-by-side columns. Both should be ~0 on
 * every page — the fill rules in `rowCombination.ts` exist to keep them there.
 */

import { LAYOUT } from '@/app/constants';
import type { AnyContentModel } from '@/app/types/Content';
import { isPanelContent } from '@/app/utils/contentTypeGuards';
import type { BoxTree } from '@/app/utils/rowCombination';

interface SizedItem {
  content: AnyContentModel;
  width: number;
  height: number;
}

interface RowLike {
  items: SizedItem[];
  boxTree?: BoxTree;
}

export interface RowMeasurements {
  /** Width the row's content spans, leaf widths + gaps, walked through the tree. */
  spanPx: number;
  /** Rendered row height: tallest column, stacks summed with their gaps. */
  heightPx: number;
  /** Blank area inside the row from column-height mismatches, in px². */
  pocketPx2: number;
  /** Compact structure string, e.g. `H(V(panel:users, panel:messages), image:All Images)`. */
  structure: string;
}

function leafLabel(content: AnyContentModel): string {
  if (isPanelContent(content)) return `panel:${content.panelType}`;
  const title = 'title' in content && content.title ? content.title : content.contentType;
  return `${content.contentType.toLowerCase()}:${title}`;
}

/** Measure one packed row. Rows without a tree (header rails) measure as their items alone. */
export function measureRow(row: RowLike, gap: number = LAYOUT.gridGap): RowMeasurements {
  if (!row.boxTree) {
    const width = row.items.reduce((sum, item) => sum + item.width, 0);
    const height = Math.max(0, ...row.items.map(item => item.height));
    return { spanPx: width, heightPx: height, pocketPx2: 0, structure: 'rail' };
  }

  let cursor = 0;
  const walk = (tree: BoxTree): { w: number; h: number; pocket: number; label: string } => {
    if (tree.type === 'leaf') {
      const item = row.items[cursor++];
      if (!item) return { w: 0, h: 0, pocket: 0, label: leafLabel(tree.content) };
      return { w: item.width, h: item.height, pocket: 0, label: leafLabel(item.content) };
    }
    const first = walk(tree.children[0]);
    const second = walk(tree.children[1]);
    if (tree.direction === 'vertical') {
      return {
        w: Math.max(first.w, second.w),
        h: first.h + gap + second.h,
        pocket: first.pocket + second.pocket,
        label: `V(${first.label}, ${second.label})`,
      };
    }
    const height = Math.max(first.h, second.h);
    return {
      w: first.w + gap + second.w,
      h: height,
      pocket:
        first.pocket +
        second.pocket +
        (height - first.h) * first.w +
        (height - second.h) * second.w,
      label: `H(${first.label}, ${second.label})`,
    };
  };

  const root = walk(row.boxTree);
  return { spanPx: root.w, heightPx: root.h, pocketPx2: root.pocket, structure: root.label };
}

/**
 * One line per row: index, span×height, right-edge gap against `contentWidth`, internal pocket,
 * the structure string, then each leaf's rendered size in tree order.
 */
export function describeLayoutRows(
  rows: RowLike[],
  contentWidth?: number,
  gap: number = LAYOUT.gridGap
): string[] {
  return rows.map((row, index) => {
    const m = measureRow(row, gap);
    const edge =
      contentWidth === undefined ? '' : ` edgeGap=${(contentWidth - m.spanPx).toFixed(1)}`;
    const sizes = row.items
      .map(item => `${item.width.toFixed(0)}×${item.height.toFixed(0)}`)
      .join(' ');
    return (
      `row ${index}: ${m.spanPx.toFixed(1)}×${m.heightPx.toFixed(1)}${edge}` +
      ` pocket=${(m.pocketPx2 / 1000).toFixed(1)}k | ${m.structure} | ${sizes}`
    );
  });
}
