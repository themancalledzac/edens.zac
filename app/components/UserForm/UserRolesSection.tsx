'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useState } from 'react';

import { FormError } from '@/app/components/ui/Field/FormError';
import { IconButton } from '@/app/components/ui/IconButton/IconButton';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { addUserToRole, listRoles, listUserRoles, removeUserFromRole } from '@/app/lib/api/roles';
import { type RoleSummary, type UserRoleRow } from '@/app/types/Role';
import { logger } from '@/app/utils/logger';

import styles from './UserRolesSection.module.scss';

/** The role index. The section's own "Roles" label links here. */
export const ROLES_HREF = '/admin/roles';

/** Detail for one role — its members and the collections it grants. */
export function roleHref(roleId: number): string {
  return `${ROLES_HREF}/${roleId}`;
}

export interface UserRolesSectionProps {
  userId: number;
  /**
   * Render membership without the controls that change it. The read view of the user detail page
   * passes this; the edit surfaces do not.
   */
  readOnly?: boolean;
  /**
   * Lay the roles out as a wrapping row of chips instead of a stacked list.
   *
   * The admin user rail passes this. Roles are one short word each, and a full-width row per role
   * spent a whole line on a name and left its remove button stranded at the far edge; as chips the
   * same membership costs a line or two total, which is what a supporting detail beside a photo
   * grid is worth.
   */
  compact?: boolean;
}

/**
 * One user's role membership — the list, and (unless `readOnly`) the controls to change it.
 *
 * Every role name here is a link. A role is a real place in this admin — `/admin/roles/[roleId]`
 * shows its members and the collections it grants — and membership is only half the question an
 * admin auditing access is asking. The section's own "Roles" label links to the index for the same
 * reason. This replaced a trailing "Manage roles and grants" link, which was a third control
 * pointing at a destination the surrounding text already named.
 *
 * Adding a role commits on `change` rather than behind a second "Add" button. The select has no
 * draft state worth confirming — picking a name in a list of joinable roles *is* the intent, and
 * the separate button meant every add was two taps, with a dead-end state in between where a role
 * was chosen but not applied. Failure is still reported (`actionError`), and the list refetches
 * from the server rather than being patched locally, so what is shown is what the backend stored.
 *
 * A failed read surfaces as `rolesError` rather than an empty list, and this is the one thing here
 * that must not regress: both reads throw `ApiError` out of `fetchAdminGetApi` on any non-OK
 * response, and substituting `[]` would tell an admin auditing permissions that the user is "Not
 * in any roles yet." — a confident, wrong answer about who can see what. Unknown membership is
 * reported as unknown. (Carried over from `UserForm`, where this block used to live.)
 *
 * `readOnly` skips the `listRoles` catalog read entirely. It only ever fed the add-select, so
 * fetching it for a view with no add-select would be a second round trip bought for nothing.
 *
 * Labelled by a `role="group"` + `aria-labelledby` pair rather than a heading, because this renders
 * under an `<h2>` inside `UserManagementPanel` and under the page's own heading level on
 * `/admin/users/[id]`. No fixed heading level is correct in both, and the component cannot know
 * which it is in — so it stops contributing to the document outline entirely. `role="group"` is the
 * ARIA equivalent of `<fieldset>`/`<legend>`. A `<section aria-labelledby>` was rejected: a named
 * section becomes a `region` landmark, promoting a form subsection to page-level navigation.
 */
export function UserRolesSection({
  userId,
  readOnly = false,
  compact = false,
}: UserRolesSectionProps) {
  const headingId = useId();
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [allRoles, setAllRoles] = useState<RoleSummary[]>([]);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setRolesError(null);
    void (async () => {
      try {
        const [membership, all] = await Promise.all([
          listUserRoles(userId),
          readOnly ? Promise.resolve<RoleSummary[]>([]) : listRoles(),
        ]);
        setUserRoles(membership);
        setAllRoles(all);
      } catch (error) {
        logger.error('UserRolesSection', 'Failed to load role membership', error, { userId });
        setUserRoles([]);
        setAllRoles([]);
        setRolesError(
          'Could not load roles for this user — their membership is unknown. Reload to try again.'
        );
      }
    })();
  }, [userId, readOnly]);

  const availableRoles = allRoles.filter(r => !userRoles.some(ur => ur.roleId === r.id));

  /**
   * Run a membership change, then re-read membership.
   *
   * The write and the read back are reported separately on purpose. Folding them into one
   * try/catch meant a change that SUCCEEDED and then failed to re-read announced itself as
   * "Failed to add role" — telling an admin the grant did not happen when it did, which is the
   * one direction of wrong that gets acted on (they retry, or they walk away believing access
   * was not given). A failed refetch is reported as what it is: the change landed, the list on
   * screen is now stale.
   */
  const runAction = useCallback(
    async (action: () => Promise<void>, failure: string) => {
      setActionError(null);
      setPending(true);
      try {
        await action();
      } catch (error) {
        logger.error('UserRolesSection', failure, error, { userId });
        setActionError(failure);
        setPending(false);
        return;
      }
      try {
        setUserRoles(await listUserRoles(userId));
      } catch (error) {
        logger.error('UserRolesSection', 'Role change saved but re-read failed', error, { userId });
        setActionError('Saved, but this list could not be re-read — reload to confirm it.');
      } finally {
        setPending(false);
      }
    },
    [userId]
  );

  /**
   * The join control. A `<select>` whose empty option is its label, so it reads as a button that
   * happens to open a list — which is what it is. Compact shortens the label to "Add" and skins it
   * as a chip so it can lead the chip row; the accessible name stays the fuller "Add Role", which
   * still contains the visible word.
   */
  const addControl = !readOnly && availableRoles.length > 0 && (
    <select
      aria-label="Add Role"
      className={compact ? styles.addChip : styles.addSelect}
      value=""
      disabled={pending}
      onChange={e => {
        const roleId = Number(e.target.value);
        if (!roleId) return;
        void runAction(
          () => addUserToRole(userId, roleId),
          'Failed to add role. Please try again.'
        );
      }}
    >
      <option value="">{compact ? 'Add' : 'Add Role'}</option>
      {availableRoles.map(r => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );

  return (
    <div
      className={[styles.roles, compact ? styles.rolesCompact : ''].filter(Boolean).join(' ')}
      role="group"
      aria-labelledby={headingId}
    >
      <p id={headingId} className={styles.heading}>
        <Link href={ROLES_HREF} className={styles.headingLink}>
          Roles
        </Link>
      </p>

      {rolesError && <FormError>{rolesError}</FormError>}
      {actionError && <FormError>{actionError}</FormError>}
      {!rolesError && userRoles.length === 0 && <EmptyState>Not in any roles yet.</EmptyState>}

      {(userRoles.length > 0 || (compact && addControl)) && (
        <ul className={compact ? styles.chipList : styles.list}>
          {/* Compact leads the row with the join control, so "Roles" is followed immediately by the
              way to add one and the row stays a single wrapping line. */}
          {compact && addControl && <li className={styles.addItem}>{addControl}</li>}
          {userRoles.map(r => (
            <li key={r.roleId} className={compact ? styles.chip : styles.row}>
              <Link href={roleHref(r.roleId)} className={styles.roleLink}>
                {r.name}
              </Link>
              {!readOnly && (
                <IconButton
                  aria-label={`Remove ${r.name}`}
                  shape="square"
                  size="sm"
                  className={styles.remove}
                  disabled={pending}
                  onClick={() =>
                    void runAction(
                      () => removeUserFromRole(userId, r.roleId),
                      'Failed to remove role. Please try again.'
                    )
                  }
                >
                  ×
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {!compact && addControl}
    </div>
  );
}

export default UserRolesSection;
