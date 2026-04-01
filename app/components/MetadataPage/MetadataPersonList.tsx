'use client';

import Link from 'next/link';
import { useState } from 'react';

import { fetchAdminDeleteApi, fetchAdminPutJsonApi } from '@/app/lib/api/core';
import type { ContentPersonModel } from '@/app/types/ImageMetadata';

import styles from './MetadataPage.module.scss';

interface MetadataPersonListProps {
  items: ContentPersonModel[];
}

export function MetadataPersonList({ items: initialItems }: MetadataPersonListProps) {
  const [items, setItems] = useState(initialItems);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (id: number, value: string) => {
    setEditedNames(prev => ({ ...prev, [id]: value }));
  };

  const handleUpdate = async (item: ContentPersonModel) => {
    const newName = editedNames[item.id]?.trim();
    if (!newName) return;

    setError(null);
    const response = await fetchAdminPutJsonApi<ContentPersonModel>(`/metadata/people/${item.id}`, {
      name: newName,
    });
    if (response !== null) {
      setItems(prev => prev.map(i => (i.id === item.id ? response : i)));
      setEditedNames(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } else {
      setError(`Failed to update '${item.name}'`);
    }
  };

  const handleDelete = async (item: ContentPersonModel) => {
    if (!window.confirm(`Delete '${item.name}'?`)) return;

    setError(null);
    const response = await fetchAdminDeleteApi(`/metadata/people/${item.id}`);
    if (response !== null) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setEditedNames(prev => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } else {
      setError(`Failed to delete '${item.name}'`);
    }
  };

  const isEdited = (item: ContentPersonModel) => {
    const edited = editedNames[item.id];
    return edited !== undefined && edited.trim() !== item.name;
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
              {item.slug && (
                <Link
                  href={`/people/${item.slug}`}
                  className={styles.goToLink}
                  title={`Go to ${item.name}`}
                >
                  &rarr;
                </Link>
              )}
              <input
                type="text"
                className={styles.itemNameInput}
                value={editedNames[item.id] ?? item.name}
                onChange={e => handleNameChange(item.id, e.target.value)}
              />
              <div className={styles.rowActions}>
                {isEdited(item) && (
                  <button
                    type="button"
                    className={styles.updateButton}
                    onClick={() => handleUpdate(item)}
                  >
                    Update
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => handleDelete(item)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
