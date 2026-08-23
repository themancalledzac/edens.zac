'use client';

import { useMemo, useState } from 'react';

import { AdminPanelCollapseProvider } from '@/app/components/AdminPanel/AdminPanelCollapseContext';
import {
  type AdminPanelSeed,
  AdminPanelSeedProvider,
} from '@/app/components/AdminPanel/AdminPanelSeedContext';
import ContentBlockWithFullScreen from '@/app/components/Content/ContentBlockWithFullScreen';
import { type AnyContentModel, type PanelType } from '@/app/types/Content';

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
 * Owns which hub panels are collapsed, and re-derives the content array from it.
 *
 * This sits above `Component` on purpose. Layout is a pure function of the content models, so
 * swapping a collapsed panel's footprint here is what makes the whole hub re-pack — the panels
 * still standing widen, and the nav tiles grow with them. State held any lower (it used to live in
 * `AdminPanelRenderer`) can only shrink one panel's own box; its row stays as tall as its tallest
 * sibling and nothing else moves.
 *
 * Collapse is the ONLY thing that rewrites a footprint. Feeding each panel's *measured* size back
 * in was tried and reverted on 2026-08-10 — see the `AdminPanelRenderer` docblock for why it
 * cannot converge, and what a future attempt has to prove first.
 *
 * Panels that force themselves open — `UserManagementPanel` entering create/edit, `RolesPanel`
 * opening a role from `?role=[id]` — do it through the same `onCollapsedChange`, so they re-pack
 * the hub on the way open without knowing this component exists.
 *
 * Initial state is all-expanded on both server and client, so there is no hydration mismatch, and
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
  const [collapsed, setCollapsedState] = useState<Record<PanelType, boolean>>({
    users: false,
    messages: false,
    roles: false,
    collections: false,
  });
  const collapse = useMemo(
    () => ({
      isCollapsed: (panelType: PanelType) => collapsed[panelType],
      setCollapsed: (panelType: PanelType, next: boolean) =>
        setCollapsedState(prev =>
          prev[panelType] === next ? prev : { ...prev, [panelType]: next }
        ),
    }),
    [collapsed]
  );

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

export default AdminHubClient;
