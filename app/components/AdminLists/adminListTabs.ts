import type { ListPanelTab } from '@/app/components/ListPanel/ListPanel';

/** The lists the admin hub's one tabbed panel switches between. */
export type AdminListTab = 'users' | 'messages' | 'roles' | 'collections';

/**
 * The hub panel's tabs, in the order the strip shows them. The first is the default. Server-safe
 * (no client code), so `adminHubContent.ts` can size the panel from the same list the strip renders.
 */
export const ADMIN_LIST_TABS: ReadonlyArray<ListPanelTab<AdminListTab>> = [
  { id: 'users', label: 'Users' },
  { id: 'messages', label: 'Messages' },
  { id: 'roles', label: 'Roles' },
  { id: 'collections', label: 'Collections' },
];

export const DEFAULT_ADMIN_LIST_TAB: AdminListTab = 'users';

/** The query param that carries the active tab, so a tab survives a reload and can be linked to. */
export const ADMIN_LIST_TAB_PARAM = 'list';

export function isAdminListTab(value: string | null): value is AdminListTab {
  return ADMIN_LIST_TABS.some(tab => tab.id === value);
}

/**
 * The active tab for a set of search params. `?list=` wins; otherwise a `?role=` link (what
 * `UserRolesSection` points at) means the Roles tab, since that is where the role opens; otherwise
 * the default. An unknown `?list=` value falls through rather than showing nothing.
 */
export function resolveAdminListTab(params: Pick<URLSearchParams, 'get'>): AdminListTab {
  const requested = params.get(ADMIN_LIST_TAB_PARAM);
  if (isAdminListTab(requested)) return requested;
  if (params.get('role')) return 'roles';
  return DEFAULT_ADMIN_LIST_TAB;
}
