'use client';

import { createContext, type ReactNode, useContext } from 'react';

/**
 * Extra content for the collection header rail — the TEXT block that leads the first row
 * alongside the cover image.
 *
 * That rail is where this app puts what is *about* the collection rather than *in* it: the date,
 * location, description, sibling links, the client-gallery download row and the filter toolbar.
 * A page whose header carries page-level information belongs there too, rather than in a slab
 * below the grid — which is what `/user`'s Account and Admin cards used to be.
 *
 * A context rather than a prop because the rail is rendered from a content MODEL, several layers
 * down a layout pipeline (CollectionPageClient -> ContentBlockWithFullScreen -> BoxRenderer ->
 * CollectionContentRenderer) whose props are all about blocks and sizing. Threading a ReactNode
 * through those layers would put page-specific cargo in every one of them. This mirrors how
 * {@link useCollectionFilter} and {@link useInlineEdit} already reach the same rail.
 */
const CollectionRailContext = createContext<ReactNode>(null);

/**
 * `value` may be null, which is observationally identical to not mounting the provider — so an
 * owner can gate rail content on something that changes over time without reparenting (and
 * therefore remounting) the whole collection subtree.
 */
export function CollectionRailProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: ReactNode;
}) {
  return <CollectionRailContext.Provider value={value}>{children}</CollectionRailContext.Provider>;
}

/** Extra rail content for this page, or null when the page supplies none. */
export function useCollectionRailExtras(): ReactNode {
  return useContext(CollectionRailContext);
}
