'use client';

import { useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Modal } from '@/app/components/ui/Modal/Modal';
import { ApiError } from '@/app/lib/api/core';
import { getMergePreview, mergeUser } from '@/app/lib/api/users';
import { type AdminUserSummary, type MergePreview } from '@/app/types/User';

import styles from './MergeIdentityModal.module.scss';

export interface MergeIdentityModalProps {
  /** The tag-only PERSON being absorbed. */
  source: AdminUserSummary;
  /** Candidate survivors (every identity except the source). */
  candidates: AdminUserSummary[];
  open: boolean;
  onClose: () => void;
  onMerged: () => void;
}

const labelFor = (u: AdminUserSummary) =>
  u.email ? `${u.displayName ?? '—'} (${u.email})` : `${u.displayName ?? '—'} · tag-only`;

/**
 * Confirmation modal for absorbing a tag-only PERSON (`source`) into a surviving identity. A native
 * `<select>` survivor-picker loads a {@link getMergePreview} on change; confirming calls
 * {@link mergeUser} then `onMerged`. The merge is irreversible (the source row is hard-deleted).
 */
export function MergeIdentityModal({
  source,
  candidates,
  open,
  onClose,
  onMerged,
}: MergeIdentityModalProps) {
  const [targetId, setTargetId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async (id: number) => {
    setTargetId(id);
    setPreview(null);
    setError(null);
    if (!id) return;
    setLoading(true);
    try {
      setPreview(await getMergePreview(source.id, id));
    } catch {
      setError('Could not load a preview for that identity.');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (targetId == null) return;
    setLoading(true);
    setError(null);
    try {
      await mergeUser(targetId, source.id);
      onMerged();
    } catch (error_) {
      setError(
        error_ instanceof ApiError && error_.status === 409
          ? 'That merge is not allowed (only tag-only people can be absorbed).'
          : 'Merge failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} variant="overlay" labelledBy="merge-identity-title">
      <div className={styles.card}>
        <h2 id="merge-identity-title" className={styles.title}>
          Merge “{source.displayName ?? '—'}” into…
        </h2>
        <label className={styles.field}>
          <span>Keep this identity:</span>
          <select
            className={styles.select}
            value={targetId ?? ''}
            onChange={e => void loadPreview(Number(e.target.value))}
          >
            <option value="">Select an identity…</option>
            {candidates.map(c => (
              <option key={c.id} value={c.id}>
                {labelFor(c)}
              </option>
            ))}
          </select>
        </label>

        {loading && <p className={styles.muted}>Working…</p>}
        {error && <FormError>{error}</FormError>}
        {preview && !loading && (
          <p className={styles.preview}>
            Moves <strong>{preview.imageTagCount}</strong> image tag(s) and{' '}
            <strong>{preview.collectionCount}</strong> collection(s) from{' '}
            <strong>{preview.sourceName ?? '—'}</strong> onto{' '}
            <strong>{preview.targetName ?? '—'}</strong>
            {preview.duplicatesCollapsed > 0
              ? `, collapsing ${preview.duplicatesCollapsed} duplicate(s)`
              : ''}
            , then permanently deletes “{preview.sourceName ?? '—'}”. This can’t be undone.
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={targetId == null || loading} loading={loading}>
            Merge
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default MergeIdentityModal;
