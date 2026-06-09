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
 */
export function CollectionEditSheet({ edit }: CollectionEditSheetProps) {
  const { editTab } = edit;

  return (
    <div className={styles.editSheet}>
      {editTab === 'info' && <InfoTab edit={edit} />}
      {editTab === 'structure' && <StructureTab edit={edit} />}
    </div>
  );
}

export default CollectionEditSheet;
