'use client';

import styles from './CollectionEditSheet.module.scss';
import { InfoTab } from './sections/InfoTab';
import { StructureTab } from './sections/StructureTab';
import { type UseCollectionEditResult } from './useCollectionEdit';

interface CollectionEditSheetProps {
  /** The full hook result — the sheet is purely presentational over this surface. */
  edit: UseCollectionEditResult;
}

/**
 * Slide-up sheet that renders the active edit tab's fields.
 *
 * The tab row and Save button live in the consumer's EditBar — this component
 * renders only the scrollable field area for the active tab.
 *
 * ARIA contract: because only one panel is in the DOM at a time (conditional
 * rendering, not hidden), the container takes `role="tabpanel"` and its `id`
 * changes with the active tab.  EditBar emits `aria-controls` only for the
 * selected tab, so the reference always resolves to this mounted element.
 */
export function CollectionEditSheet({ edit }: CollectionEditSheetProps) {
  const { editTab } = edit;

  return (
    <div
      className={styles.editSheet}
      role="tabpanel"
      id={`tabpanel-${editTab}`}
      aria-labelledby={`tab-${editTab}`}
    >
      {editTab === 'info' && <InfoTab edit={edit} />}
      {editTab === 'structure' && <StructureTab edit={edit} />}
    </div>
  );
}

export default CollectionEditSheet;
