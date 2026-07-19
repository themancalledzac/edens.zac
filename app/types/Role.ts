/**
 * Role-based access types — mirror the backend RBAC contract (AdminRoleController + the
 * reshaped `/api/admin/users/{id}/roles` membership endpoints). A user joins roles; a role holds
 * per-collection grants; effective access is the union across a user's roles, CLIENT beating
 * GENERAL.
 */

import { type CollectionRole } from '@/app/types/Auth';

/** Access a role grants on a collection. GENERAL = view-only; CLIENT = download + tag + star. */
export type AccessLevel = CollectionRole;

/** How a role came to exist. PERSONAL = auto-migrated per-user default; SHARED = admin-curated. */
export type RoleKind = 'PERSONAL' | 'SHARED';

/** A role in the admin list (`GET /api/admin/roles`). */
export interface RoleSummary {
  id: number;
  name: string;
  kind: RoleKind;
}

/** One member of a role (`RoleDetail.members`). `email`/`name` are null for tag-only identities. */
export interface RoleMemberRow {
  userId: number;
  email: string | null;
  name: string | null;
}

/** One collection a role grants (`RoleDetail.collections`). */
export interface RoleCollectionRow {
  collectionId: number;
  title: string;
  level: AccessLevel;
}

/** Full role detail (`GET /api/admin/roles/{roleId}`). */
export interface RoleDetail {
  id: number;
  name: string;
  kind: RoleKind;
  members: RoleMemberRow[];
  collections: RoleCollectionRow[];
}

/** One role a user belongs to (`GET /api/admin/users/{id}/roles`). */
export interface UserRoleRow {
  roleId: number;
  name: string;
  kind: RoleKind;
}

/**
 * One role granting a collection (`GET /api/admin/collections/{id}/roles`).
 *
 * `inheritedFromCollectionId`/`inheritedFromCollectionTitle` carry waterfall provenance: non-null
 * means the grant was materialized down from a parent collection — the id/title identify the
 * origin collection holding the direct grant, and the grant is edited there. Both are optional
 * because the backend may not expose them yet; treat `undefined` exactly like `null` (a direct
 * grant).
 */
export interface CollectionRoleRow {
  roleId: number;
  name: string;
  kind: RoleKind;
  level: AccessLevel;
  inheritedFromCollectionId?: number | null;
  inheritedFromCollectionTitle?: string | null;
}

/** Body for `POST /api/admin/roles`. `kind` defaults to SHARED server-side when omitted. */
export interface CreateRoleRequest {
  name: string;
  kind?: RoleKind;
}
