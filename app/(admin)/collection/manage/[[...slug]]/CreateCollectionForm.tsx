'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { revalidateCollectionCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { Button } from '@/app/components/ui/Button/Button';
import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { createCollection } from '@/app/lib/api/collections';
import { type CollectionCreateRequest } from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';
import { manageHref } from '@/app/utils/manageUrl';

import styles from './CreateCollectionForm.module.scss';

/**
 * Minimal "create a new collection" form — the only surviving responsibility of the
 * old manage route. On success it redirects into the in-place edit surface (`?manage=1`).
 */
export function CreateCollectionForm() {
  const router = useRouter();
  // Both flags default off: an ordinary collection is the default kind. The backend folds a
  // request with neither flag onto its no-op base, so nothing extra is sent for that case.
  const [createData, setCreateData] = useState<CollectionCreateRequest>({ title: '' });

  const setKind = (kind: 'isClient' | 'isBlog', checked: boolean) => {
    setCreateData(prev => {
      const next = { ...prev, [kind]: checked || undefined };
      if (checked) next[kind === 'isClient' ? 'isBlog' : 'isClient'] = undefined;
      return next;
    });
  };
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await createCollection(createData);
      if (response !== null) {
        await revalidateCollectionCache(response.collection.slug);
        router.replace(manageHref(response.collection.slug));
      }
    } catch (error_) {
      const detail = handleApiError(error_, '');
      setError(
        detail.length > 0 ? `Failed to create collection: ${detail}` : 'Failed to create collection'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.createContainer}>
      <h2 className={styles.createHeading}>Create New Collection</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form onSubmit={handleCreate}>
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Kind</span>
          <div className={styles.checkboxRow}>
            <label className={styles.checkboxLabel}>
              <Checkbox
                checked={createData.isClient === true}
                onChange={e => setKind('isClient', e.target.checked)}
              />
              <span>Client gallery</span>
            </label>
            <label className={styles.checkboxLabel}>
              <Checkbox
                checked={createData.isBlog === true}
                onChange={e => setKind('isBlog', e.target.checked)}
              />
              <span>Blog</span>
            </label>
          </div>
        </div>

        <div className={styles.formGroup}>
          <Field label="Title *" htmlFor="create-title">
            <Input
              id="create-title"
              value={createData.title}
              onChange={e => setCreateData(prev => ({ ...prev, title: e.target.value }))}
              required
              placeholder="e.g., Film Pack 002"
            />
          </Field>
        </div>

        <Button type="submit" disabled={isCreating}>
          {isCreating ? 'Creating...' : 'Create Collection'}
        </Button>
      </form>
    </div>
  );
}

export default CreateCollectionForm;
