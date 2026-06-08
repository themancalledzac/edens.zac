import type { ReactElement } from 'react';

import { Button } from '@/app/components/ui/Button/Button';

import styles from '../MetadataModal.module.scss';

export interface MetadataActionRowProps {
  isBulkEdit: boolean;
  selectedCount: number;
  saving: boolean;
  hasChanges: boolean;
  showRemove: boolean;
  onDelete: () => void;
  onRemove: () => void;
  onCancel: () => void;
}

/**
 * Sticky action bar rendered at the bottom of the metadata editor sheet.
 *
 * Save uses `variant="primary"` which resolves to white-fill / dark-text under
 * [data-surface="dark"] — no manual override needed. Cancel uses `variant="outline"`.
 * The Save button is `type="submit"` so it triggers the form's `onSubmit` handler.
 */
export default function MetadataActionRow({
  isBulkEdit,
  selectedCount,
  saving,
  hasChanges,
  showRemove,
  onDelete,
  onRemove,
  onCancel,
}: MetadataActionRowProps): ReactElement {
  const countLabel = isBulkEdit ? `${selectedCount} Images` : 'Image';

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionBarLeft}>
        <Button variant="danger" size="sm" loading={saving} onClick={onDelete}>
          {`Delete ${countLabel}`}
        </Button>
        {showRemove && (
          <Button
            variant="warning"
            size="sm"
            loading={saving}
            onClick={onRemove}
            title="Remove from current collection (image stays in the system)"
          >
            {`Remove ${countLabel}`}
          </Button>
        )}
      </div>
      <div className={styles.actionBarRight}>
        <Button variant="outline" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={saving} disabled={!hasChanges}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
