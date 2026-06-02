'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/app/components/ui/Button/Button';
import { fetchAdminDeleteApi, fetchAdminPutJsonApi } from '@/app/lib/api/core';

import styles from './MetadataList.module.scss';

export interface MetadataListItem {
  id: number;
  name: string;
  slug?: string;
}

export interface MetadataListProps<T extends MetadataListItem> {
  title: string;
  emptyLabel: string;
  items: T[];
  /** REST base for PUT/DELETE, e.g. "/metadata/tags". Item id is appended. */
  basePath: string;
  /** Optional "go to" target for an item (e.g. /people/[slug]). */
  getHref?: (item: T) => string | null;
}

/** Generic editable metadata list (tags / people / locations). */
export function MetadataList<T extends MetadataListItem>({
  title,
  emptyLabel,
  items: initialItems,
  basePath,
  getHref,
}: MetadataListProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [editedNames, setEditedNames] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  const handleNameChange = (id: number, value: string) => {
    setEditedNames(prev => ({ ...prev, [id]: value }));
  };

  const clearEdit = (id: number) => {
    setEditedNames(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleUpdate = async (item: T) => {
    const newName = editedNames[item.id]?.trim();
    if (!newName || saving !== null) return;

    setError(null);
    setSaving(item.id);
    try {
      const response = await fetchAdminPutJsonApi<T>(`${basePath}/${item.id}`, { name: newName });
      if (response !== null) {
        setItems(prev => prev.map(i => (i.id === item.id ? response : i)));
        clearEdit(item.id);
      } else {
        setError(`Failed to update '${item.name}'`);
      }
    } catch {
      setError(`Failed to update '${item.name}'`);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (item: T) => {
    if (!window.confirm(`Delete '${item.name}'?`) || saving !== null) return;

    setError(null);
    setSaving(item.id);
    try {
      await fetchAdminDeleteApi(`${basePath}/${item.id}`);
      setItems(prev => prev.filter(i => i.id !== item.id));
      clearEdit(item.id);
    } catch {
      setError(`Failed to delete '${item.name}'`);
    } finally {
      setSaving(null);
    }
  };

  const isEdited = (item: T) => {
    const edited = editedNames[item.id];
    return edited !== undefined && edited.trim() !== item.name;
  };

  return (
    <div className={styles.listSection}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>{title}</h2>
        <span className={styles.listCount}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className={styles.emptyState}>{emptyLabel}</p>
      ) : (
        <div className={styles.list}>
          {items.map(item => {
            const href = getHref?.(item) ?? null;
            return (
              <div key={item.id} className={styles.row}>
                {href && (
                  <Link href={href} className={styles.goToLink} title={`Go to ${item.name}`}>
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={saving === item.id}
                      disabled={saving !== null}
                      onClick={() => handleUpdate(item)}
                    >
                      Update
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={saving !== null}
                    onClick={() => handleDelete(item)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export default MetadataList;
