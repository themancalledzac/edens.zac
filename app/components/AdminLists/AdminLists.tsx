'use client';

import { useSearchParams } from 'next/navigation';
import { type ComponentType, useCallback } from 'react';

import { CollectionsPanel } from '@/app/components/CollectionsPanel/CollectionsPanel';
import { type ListPanelShell } from '@/app/components/ListPanel/ListPanel';
import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import { RolesPanel } from '@/app/components/RolesPanel/RolesPanel';
import UserManagementPanel from '@/app/components/UserManagementPanel/UserManagementPanel';

import {
  ADMIN_LIST_TAB_PARAM,
  ADMIN_LIST_TABS,
  type AdminListTab,
  isAdminListTab,
  resolveAdminListTab,
} from './adminListTabs';

/**
 * A lookup rather than a ternary chain: an `else` branch silently renders the wrong tab for
 * anything it does not name, while a missing key here is a type error.
 */
const TAB_PANELS: Record<AdminListTab, ComponentType<{ shell: ListPanelShell }>> = {
  users: UserManagementPanel,
  messages: MessagesPanel,
  roles: RolesPanel,
  collections: CollectionsPanel,
};

interface AdminListsProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * The admin hub's one list panel: Users, Messages, Roles and Collections as tabs of a single box.
 *
 * Only the active tab's panel is mounted. Each panel still renders its own {@link ListPanel}, and
 * receives the tab strip and collapse state as its `shell`, so the header's far-right action is
 * always the active tab's own (`+ New User`, `View all`, `+ New Role`) without this component
 * knowing what any of them are. Switching tabs remounts the panel, which is cheap: every list is
 * cached by `useCachedPanelData` and repaints from cache.
 *
 * The active tab lives in the URL (`?list=`, see {@link resolveAdminListTab}) so it survives a
 * reload and can be linked to. A tab click writes it with `history.replaceState`, which Next.js
 * syncs into `useSearchParams` without a navigation — the same approach `UserSpaceGrid` takes for
 * its section chips, and for the same reason: a router navigation would re-run this force-dynamic
 * page's server fetches for a change the client already has everything for. Choosing a tab also
 * drops `?role=`, so returning to Roles later shows the list rather than reopening that role.
 */
export function AdminLists({ collapsed, onCollapsedChange }: AdminListsProps) {
  const searchParams = useSearchParams();
  const active = resolveAdminListTab(searchParams);

  const selectTab = useCallback((id: string) => {
    if (!isAdminListTab(id)) return;
    const params = new URLSearchParams(window.location.search);
    params.set(ADMIN_LIST_TAB_PARAM, id);
    params.delete('role');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);

  const Panel = TAB_PANELS[active];
  return (
    <Panel
      shell={{
        tabs: { tabs: ADMIN_LIST_TABS, active, onChange: selectTab },
        collapsed,
        onCollapsedChange,
      }}
    />
  );
}
