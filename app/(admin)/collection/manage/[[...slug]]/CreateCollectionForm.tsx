'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { revalidateCollectionCache } from '@/app/components/ContentCollection/edit/collectionEditUtils';
import { Button } from '@/app/components/ui/Button/Button';
import { Field } from '@/app/components/ui/Field/Field';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { createCollection } from '@/app/lib/api/collections';
import {
  ASSIGNABLE_COLLECTION_TYPES,
  COLLECTION_TYPE_LABELS,
  type CollectionCreateRequest,
  CollectionType,
} from '@/app/types/Collection';
import { handleApiError } from '@/app/utils/apiUtils';

import styles from './CreateCollectionForm.module.scss';

/**
 * Minimal "create a new collection" form — the only surviving responsibility of the
 * old manage route. On success it redirects into the in-place edit surface (`?manage=1`).
 */
export function CreateCollectionForm() {
  const router = useRouter();
  const [createData, setCreateData] = useState<CollectionCreateRequest>({
    type: CollectionType.PORTFOLIO,
    title: '',
  });
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
        router.replace(`/${response.collection.slug}?manage=1`);
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
          <Field label="Collection Type *" htmlFor="create-type">
            <Select
              id="create-type"
              value={createData.type}
              onChange={e =>
                setCreateData(prev => ({ ...prev, type: e.target.value as CollectionType }))
              }
              required
            >
              {ASSIGNABLE_COLLECTION_TYPES.map(type => (
                <option key={type} value={type}>
                  {COLLECTION_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
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
