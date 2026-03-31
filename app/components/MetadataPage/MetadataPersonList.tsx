'use client';

import { useState } from 'react';

import { fetchAdminDeleteApi } from '@/app/lib/api/core';
import type { ContentPersonModel } from '@/app/types/ImageMetadata';

import styles from './MetadataPage.module.scss';

interface MetadataPersonListProps {
  items: ContentPersonModel[];
}

export function MetadataPersonList({ items: initialItems }: MetadataPersonListProps) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (item: ContentPersonModel) => {
    if (!window.confirm(`Delete '${item.name}'?`)) return;

    setError(null);
    const response = await fetchAdminDeleteApi(`/metadata/people/${item.id}`);
    if (response !== null) {
      setItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      setError(`Failed to delete '${item.name}'`);
    }
  };

  return (
    <div className={styles.listSection}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>People</h2>
        <span className={styles.listCount}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className={styles.emptyState}>No people</p>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <div key={item.id} className={styles.row}>
              <span className={styles.itemName}>{item.name}</span>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(item)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
