'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { type CollectionListModel } from '@/app/types/Collection';
import { type RoleSummary } from '@/app/types/Role';
import { type AdminUserSummary } from '@/app/types/User';

/**
 * The lists the SERVER already fetched for this render of the hub, handed to the panels that would
 * otherwise fetch them again.
 *
 * `app/(admin)/admin/page.tsx` does not fetch these for the panels' benefit — it needs their row
 * COUNTS to reserve each panel's layout height before the first pack. Having paid for the round
 * trip, keeping only `.length` and letting the client re-request the same list is the project's
 * single-fetch rule broken in the most literal way, and it costs a "Loading…" paint over data the
 * page was already holding.
 *
 * A field is `null` when the server's own fetch failed. That is deliberately distinct from an empty
 * array: `[]` is a real answer ("no users") and seeds the panel's empty state, while `null` means
 * "no answer" and leaves the panel to load for itself, exactly as it did before this existed —
 * seeding `[]` from a failed fetch would tell an admin there are no accounts, which is the one
 * thing the panels' error branches exist to prevent.
 *
 * Messages is absent on purpose. The server fetches that panel one row deep, for `total` alone, so
 * the only payload it could seed is a one-message page presented as the whole list.
 */
export interface AdminPanelSeed {
  users?: AdminUserSummary[] | null;
  roles?: RoleSummary[] | null;
  collections?: CollectionListModel[] | null;
}

const EMPTY_SEED: AdminPanelSeed = {};

const AdminPanelSeedContext = createContext<AdminPanelSeed>(EMPTY_SEED);

/**
 * Carries the hub's server-fetched lists down to the panels.
 *
 * A context rather than props for the same reason as `AdminPanelCollapseContext`: the only path
 * from the hub to a panel runs through `BoxRenderer`, the generic recursive renderer every
 * collection page shares, which has no business learning what an admin panel is.
 *
 * Unlike collapse, the value is NOT nullable — it defaults to an empty seed, so a panel mounted
 * outside the hub (`/admin/users/[id]`, tests) reads "nothing seeded" without a null check.
 */
export function AdminPanelSeedProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AdminPanelSeed;
}) {
  return <AdminPanelSeedContext value={value}>{children}</AdminPanelSeedContext>;
}

/** The seed for this render; every field absent outside a provider. */
export function useAdminPanelSeed(): AdminPanelSeed {
  return useContext(AdminPanelSeedContext);
}
