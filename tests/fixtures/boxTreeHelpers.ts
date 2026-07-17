/**
 * Test helpers for inspecting buildRows' blank width-padding wrapper.
 *
 * An under-filled row (fill < MIN_FILL_RATIO) is wrapped by padRowToWidth as
 * `H(realSubtree, blankLeaf)` so its items render at their honest width share
 * rather than being scaled up to the full page width. Both helpers here are the
 * inspection/inverse side of that one wrapper, so they live together — if the
 * wrapper shape changes, this is the single place to update.
 */

import type { ContentBlankModel } from '@/app/types/Content';
import { isBlankContent } from '@/app/utils/contentTypeGuards';
import type { BoxTree } from '@/app/utils/rowCombination';

/**
 * Strip the blank width-padding wrapper, returning the real items' subtree.
 *
 * The exact inverse of padRowToWidth: it unwraps only when the right child is
 * genuinely a blank leaf, so a real horizontal pair passes through untouched.
 * Use it in tests that assert how the REAL items compose — padding leaves that
 * composition untouched. The wrapper itself is covered by
 * rowCombination.blankPadding.test.ts.
 */
export function realTree(tree: BoxTree): BoxTree {
  if (tree.type === 'combined') {
    const right = tree.children[1];
    if (right.type === 'leaf' && isBlankContent(right.content)) {
      return tree.children[0];
    }
  }
  return tree;
}

/** Collect every blank leaf in a BoxTree, in traversal order. */
export function collectBlanks(tree: BoxTree): ContentBlankModel[] {
  if (tree.type === 'leaf') {
    return isBlankContent(tree.content) ? [tree.content] : [];
  }
  return [...collectBlanks(tree.children[0]), ...collectBlanks(tree.children[1])];
}
