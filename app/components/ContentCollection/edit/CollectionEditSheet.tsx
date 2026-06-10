'use client';

import styles from './CollectionEditSheet.module.scss';
import { InfoTab } from './sections/InfoTab';
import { StructureTab } from './sections/StructureTab';
import { type UseCollectionEditResult } from './useCollectionEdit';

interface CollectionEditSheetProps {
  /** The full hook result — the sheet is purely presentational over this surface. */
  edit: UseCollectionEditResult;
  /**
   * Desktop layout: render Info and Structure side-by-side in a two-column grid
   * instead of one tab at a time. The consumer drops the EditBar tab chooser to match.
   */
  twoColumn?: boolean;
}

/**
 * Slide-up sheet that renders the collection's edit fields.
 *
 * Mobile: one tab panel at a time; `role="tabpanel"` id tracks the active tab so
 * EditBar's `aria-controls` always resolves to the mounted element.
 * Desktop (`twoColumn`): both sections rendered side-by-side, no tab semantics.
 */
export function CollectionEditSheet({ edit, twoColumn = false }: CollectionEditSheetProps) {
  const { editTab } = edit;

  if (twoColumn) {
    return (
      <div className={`${styles.editSheet} ${styles.twoCol}`}>
        <section className={styles.column} aria-labelledby="edit-col-info">
          <h2 id="edit-col-info" className={styles.columnHeading}>
            Info
          </h2>
          <InfoTab edit={edit} />
        </section>
        <section className={styles.column} aria-labelledby="edit-col-structure">
          <h2 id="edit-col-structure" className={styles.columnHeading}>
            Structure
          </h2>
          <StructureTab edit={edit} />
        </section>
      </div>
    );
  }

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
