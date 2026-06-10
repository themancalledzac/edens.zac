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
 * Mobile (`twoColumn=false`): renders only the active tab's field area. The tab row
 * and Save button live in the consumer's EditBar. ARIA contract: because only one panel
 * is in the DOM at a time (conditional rendering, not hidden), the container takes
 * `role="tabpanel"` and its `id` changes with the active tab. EditBar emits `aria-controls`
 * only for the selected tab, so the reference always resolves to this mounted element.
 *
 * Desktop (`twoColumn=true`): both Info and Structure are shown at once as two labeled
 * regions (no tab semantics — there is no chooser to control them), so the user sees
 * every option without switching tabs.
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
