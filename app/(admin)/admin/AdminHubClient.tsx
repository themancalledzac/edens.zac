'use client';

import { useMemo, useState } from 'react';

import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { AdminPanelCollapseProvider } from '@/app/components/ListPanel/AdminPanelCollapseContext';
import {
  type AdminPanelSeed,
  AdminPanelSeedProvider,
} from '@/app/components/ListPanel/AdminPanelSeedContext';
import { type AnyContentModel } from '@/app/types/Content';

import { withPanelFootprints } from './adminHubContent';

interface AdminHubClientProps {
  content: AnyContentModel[];
  mobileChunkSize: number;
  /** Lists the server already fetched, so a panel paints instead of loading. Omit to seed nothing. */
  seed?: AdminPanelSeed;
  serverContentWidth?: number;
  serverViewportHeight?: number;
  serverIsMobile?: boolean;
}

const NO_SEED: AdminPanelSeed = {};

/**
 * Owns whether the hub's list panel is collapsed, and re-derives the content array from it.
 *
 * This sits above `Component` on purpose. Layout is a pure function of the content models, so
 * swapping the collapsed panel's footprint here is what makes the whole hub re-pack — the nav tiles
 * widen into the space the panel gave up. State held any lower, in
 * `AdminPanelRenderer` for instance, can only shrink one panel's own box; its row stays as tall as
 * its tallest sibling and nothing else moves.
 *
 * Collapse is the ONLY thing that may rewrite a footprint. A panel's *measured* size must not feed
 * back in — see the `AdminPanelRenderer` docblock for why it cannot converge, and what an attempt
 * at it would have to prove first.
 *
 * Tabs that force the panel open — `UserManagementPanel` entering create/edit, `RolesPanel`
 * opening a role from `?role=[id]`, any tab chosen while collapsed — do it through the same
 * `onCollapsedChange`, so they re-pack the hub on the way open without knowing this exists.
 *
 * The ACTIVE TAB is deliberately not held here. The panel is sized for its tallest tab, so a tab
 * switch changes no footprint and needs no re-pack; it lives in the URL instead (`AdminLists`).
 *
 * Initial state is expanded on both server and client, so there is no hydration mismatch, and
 * collapsing is not persisted across navigations.
 *
 * It is also where the server's own fetches cross into client land: `seed` carries the users,
 * roles, and collections lists the page already loaded to size the panels, so those panels start
 * warm instead of re-requesting them (see {@link AdminPanelSeedProvider}). Same reason it is a
 * context and not a prop — `BoxRenderer` sits between this and every panel.
 */
export function AdminHubClient({
  content,
  mobileChunkSize,
  seed,
  serverContentWidth,
  serverViewportHeight,
  serverIsMobile,
}: AdminHubClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const collapse = useMemo(() => ({ collapsed, setCollapsed }), [collapsed]);

  const laidOutContent = useMemo(
    () => withPanelFootprints(content, collapsed),
    [content, collapsed]
  );

  return (
    <AdminPanelSeedProvider value={seed ?? NO_SEED}>
      <AdminPanelCollapseProvider value={collapse}>
        <ContentBlockWithFullScreen
          content={laidOutContent}
          priorityBlockIndex={0}
          enableFullScreenView={false}
          mobileChunkSize={mobileChunkSize}
          serverContentWidth={serverContentWidth}
          serverViewportHeight={serverViewportHeight}
          serverIsMobile={serverIsMobile}
        />
      </AdminPanelCollapseProvider>
    </AdminPanelSeedProvider>
  );
}
