'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type PanelType } from '@/app/types/Content';

/**
 * Collapsed state for the admin hub's panels, owned by whoever also owns the CONTENT ARRAY the
 * layout is derived from — collapsing has to change the panel's model, not just its rendering.
 */
export interface AdminPanelCollapseValue {
  isCollapsed: (panelType: PanelType) => boolean;
  setCollapsed: (panelType: PanelType, collapsed: boolean) => void;
}

const AdminPanelCollapseContext = createContext<AdminPanelCollapseValue | null>(null);

/**
 * Carries the hub's collapse state down to {@link AdminPanelRenderer}.
 *
 * A context rather than props because the only path between them runs through `BoxRenderer`, the
 * generic recursive renderer every collection page shares. It already threads ~25 pass-through
 * props and has no business learning what an admin panel is.
 *
 * Same shape as `CollectionFilterProvider`: the value is nullable, and consumers null-check.
 */
export function AdminPanelCollapseProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AdminPanelCollapseValue;
}) {
  return <AdminPanelCollapseContext value={value}>{children}</AdminPanelCollapseContext>;
}

/** Null outside a provider, which renders the panels non-collapsible. */
export function useAdminPanelCollapse(): AdminPanelCollapseValue | null {
  return useContext(AdminPanelCollapseContext);
}
