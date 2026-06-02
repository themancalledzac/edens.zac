import type { ReactElement } from 'react';

import { Button } from '@/app/components/ui/Button/Button';

import styles from '../ImageMetadataModal.module.scss';

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
 * Action button row for the metadata editor.
 *
 * Uses the `<Button>` primitive so the danger/ghost/primary variants handle focus, loading state,
 * and aria-busy automatically. The Save button is `type="submit"` — it triggers the form's
 * `onSubmit` handler in the parent orchestrator without needing an explicit `onSave` prop.
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
    <div className={styles.buttonRow}>
      <div className={styles.buttonRowLeft}>
        <Button variant="danger" loading={saving} onClick={onDelete}>
          {`Delete ${countLabel}`}
        </Button>
        {showRemove && (
          <Button
            variant="warning"
            loading={saving}
            onClick={onRemove}
            title="Remove from current collection (image stays in the system)"
          >
            {`Remove ${countLabel}`}
          </Button>
        )}
      </div>
      <div className={styles.buttonRowRight}>
        <Button variant="ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!hasChanges}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
