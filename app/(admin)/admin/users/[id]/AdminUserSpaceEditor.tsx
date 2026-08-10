'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import {
  type InlineEditContextValue,
  InlineEditProvider,
} from '@/app/components/ContentCollection/edit/InlineEditContext';
import { EditBar } from '@/app/components/ui/EditBar/EditBar';
import { FormError } from '@/app/components/ui/Field/FormError';
import { InlineEditableText } from '@/app/components/ui/InlineEditableText/InlineEditableText';
import { ApiError } from '@/app/lib/api/core';
import { updateUser } from '@/app/lib/api/users';
import { type AdminUserSummary, type UserStatus } from '@/app/types/User';
import { logger } from '@/app/utils/logger';

import { GenerateInviteButton } from '../GenerateInviteButton';
import styles from './AdminUserSpaceEditor.module.scss';

const STATUS_OPTIONS: UserStatus[] = ['INVITED', 'ACTIVE', 'DISABLED'];

export interface AdminUserSpaceEditorProps {
  user: AdminUserSummary;
  /** The user's space. Rendered inside this provider so its header rail picks up the controls. */
  children: ReactNode;
}

/**
 * Makes a user's own space the place an admin edits them, instead of stacking a duplicate profile
 * block above it.
 *
 * The space's header rail already renders this person's name and description — that is what the
 * rail is for. A separate card above it showed the same description twice and pushed the actual
 * page down by a screenful. So the fields move INTO the rail, through the same
 * {@link InlineEditProvider} the collection manage mode uses: title becomes the display name,
 * description stays exactly where it was already being displayed, and the surface-specific slots
 * carry what a collection has no equivalent for — account status pinned opposite the name, and the
 * email on the line above the description, where a reader looks for it.
 *
 * Role membership and the invite/reset control ride in `railExtras`, which lands at the foot of the
 * same rail. Nothing about this user renders outside it any more.
 *
 * `textEditorClassName` is what keeps the swap silent: the rail's controls inherit the typography
 * of the text they replace and drop the input box entirely, so clicking a value to change it
 * redraws nothing. There is no edit mode to enter and no Edit button — Enter commits, Escape
 * reverts.
 *
 * Each field commits alone. `updateUser` takes the whole record, so every write sends the other
 * three values as they stand — hence `current`, the last state the server accepted. A failed write
 * ROLLS BACK and says so: with read and edit rendering identically, a field left showing a rejected
 * value would be indistinguishable from a saved one.
 *
 * The context value is memoized because `useInlineEdit()` is read by every content tile in the
 * grid, not just the rail — a fresh object per render would re-render the whole space on each
 * keystroke's commit. Same reason `EditModeLayer` memoizes its own.
 */
export function AdminUserSpaceEditor({ user, children }: AdminUserSpaceEditorProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<AdminUserSummary>(user);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const commit = useCallback(
    async (patch: Partial<AdminUserSummary>) => {
      const next = { ...current, ...patch };
      if (
        next.email === current.email &&
        next.displayName === current.displayName &&
        next.status === current.status &&
        next.description === current.description
      ) {
        return;
      }

      // The server rejects a blank login identity with a 400; catching it here keeps the message
      // specific and avoids a write that was never going to land.
      if (!next.email?.trim()) {
        setError('Email is required — the change was rolled back.');
        return;
      }

      const previous = current;
      setError(null);
      setSaving(true);
      setCurrent(next);
      try {
        await updateUser(user.id, {
          email: next.email.trim(),
          displayName: next.displayName,
          status: next.status,
          description: next.description,
        });
        router.refresh();
      } catch (error_) {
        logger.error('AdminUserSpaceEditor', 'Failed to save user field', error_, {
          userId: user.id,
        });
        setCurrent(previous);
        if (error_ instanceof ApiError && error_.status === 409) {
          setError('A user with that email already exists — the change was rolled back.');
        } else if (error_ instanceof ApiError && error_.status === 404) {
          setError('This user no longer exists — the change was rolled back.');
        } else {
          setError('Could not save that change — it was rolled back. Please try again.');
        }
      } finally {
        setSaving(false);
      }
    },
    [current, user.id, router]
  );

  const inlineEdit = useMemo<InlineEditContextValue>(
    () => ({
      description: current.description ?? '',
      descriptionLabel: 'Description',
      textEditorClassName: styles.seamless,
      // No `title`: the leading slot is the email (below), because the space's cover already
      // carries this person's name. Editing the display name lives in the /admin Users panel.
      titleLead: (
        <InlineEditableText
          as="input"
          value={current.email ?? ''}
          onCommit={value => void commit({ email: value.trim() })}
          readOnlyClassName={styles.email}
          editorClassName={`${styles.email} ${styles.seamless}`}
          placeholder="Email"
          ariaLabel="Email"
        />
      ),
      onCommitField: (field, value) => {
        if (field !== 'description') return;
        void commit({ description: value.trim() || null });
      },
      titleAside: (
        <span className={styles.aside}>
          <select
            aria-label="Status"
            className={styles.status}
            data-status={current.status}
            value={current.status}
            disabled={saving}
            onChange={event => void commit({ status: event.target.value as UserStatus })}
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {/* Reads `current`, not `user`: the button's own label switches between "Reset pw" and
              "Resend" on account status, so it has to follow a status change made beside it. */}
          <GenerateInviteButton
            userId={user.id}
            email={current.email ?? ''}
            status={current.status}
          />
        </span>
      ),
      beforeDescription: error ? <FormError>{error}</FormError> : null,
    }),
    [current, saving, error, commit, user.id]
  );

  return (
    <InlineEditProvider value={inlineEdit}>
      {children}
      <EditBar
        ariaLabel="User actions"
        cells={[{ key: 'close', label: 'Close', onClick: () => router.push('/admin') }]}
      />
    </InlineEditProvider>
  );
}

export default AdminUserSpaceEditor;
