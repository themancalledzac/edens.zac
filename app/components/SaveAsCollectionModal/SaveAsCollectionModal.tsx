'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';
import { Field } from '@/app/components/ui/Field/Field';
import { FormError } from '@/app/components/ui/Field/FormError';
import { Select } from '@/app/components/ui/Field/Select';
import { Modal } from '@/app/components/ui/Modal/Modal';
import {
  ASSIGNABLE_COLLECTION_TYPES,
  COLLECTION_TYPE_LABELS,
  CollectionType,
} from '@/app/types/Collection';
import {
  COLLECTION_VISIBILITY_LABELS,
  CollectionVisibility,
} from '@/app/types/CollectionVisibility';

import styles from './SaveAsCollectionModal.module.scss';

interface SaveAsCollectionModalProps {
  /** Tag name shown in the dialog title. */
  tagName: string;
  onClose: () => void;
  onConfirm: (body: { type: CollectionType; visibility: CollectionVisibility }) => Promise<void>;
}

/** Confirm dialog for promoting a tag view into a real collection (type + visibility). */
export default function SaveAsCollectionModal({
  tagName,
  onClose,
  onConfirm,
}: SaveAsCollectionModalProps) {
  const [type, setType] = useState<CollectionType>(CollectionType.PORTFOLIO);
  const [visibility, setVisibility] = useState<CollectionVisibility>(CollectionVisibility.UNLISTED);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      await onConfirm({ type, visibility });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Failed to save as collection');
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} variant="overlay" labelledBy="save-as-collection-title">
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="save-as-collection-title" className={styles.heading}>
            Save “{tagName}” as Collection
          </h2>
          <CloseButton onClick={onClose} aria-label="Close" />
        </div>

        <FormError>{error}</FormError>

        <form onSubmit={handleSubmit}>
          <Field label="Type" htmlFor="save-as-collection-type" className={styles.formGroup}>
            <Select
              id="save-as-collection-type"
              value={type}
              onChange={e => setType(e.target.value as CollectionType)}
            >
              {ASSIGNABLE_COLLECTION_TYPES.map(t => (
                <option key={t} value={t}>
                  {COLLECTION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Visibility"
            htmlFor="save-as-collection-visibility"
            className={styles.formGroup}
          >
            <Select
              id="save-as-collection-visibility"
              value={visibility}
              onChange={e => setVisibility(e.target.value as CollectionVisibility)}
            >
              {Object.values(CollectionVisibility).map(v => (
                <option key={v} value={v}>
                  {COLLECTION_VISIBILITY_LABELS[v]}
                </option>
              ))}
            </Select>
          </Field>

          <div className={styles.formActions}>
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving} disabled={saving}>
              Save as Collection
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
