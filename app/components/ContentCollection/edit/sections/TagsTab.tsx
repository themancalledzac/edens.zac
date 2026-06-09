'use client';

import { PERSON_ADD_NEW_FIELDS } from '@/app/components/ui/Dropdown/commonAddNewFields';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import { type ContentPersonModel } from '@/app/types/Collection';

import { Button } from '../../../ui/Button/Button';
import { type UseCollectionEditResult } from '../useCollectionEdit';
import styles from './TagsTab.module.scss';

interface TagsTabProps {
  edit: UseCollectionEditResult;
}

/** Tags tab: collection-level tags and people associations. */
export function TagsTab({ edit }: TagsTabProps) {
  const {
    currentState,
    currentTags,
    handleTagsChange,
    collectionPeople,
    setCollectionPeople,
    peopleSaving,
    peopleStatus,
    handleSavePeople,
    handleRegeneratePeople,
  } = edit;

  return (
    <div className={styles.tabPanel}>
      {/* Tags */}
      <TagsSelector
        selectedTags={currentTags}
        availableTags={currentState?.tags || []}
        onChange={handleTagsChange}
        emptyText="No tags set"
      />

      {/* People */}
      <section aria-labelledby="edit-sheet-people-heading" className={styles.formGroup}>
        <h3 id="edit-sheet-people-heading" className={styles.formLabel}>
          People
        </h3>
        <Dropdown<ContentPersonModel>
          label=""
          multiSelect
          options={currentState?.people || []}
          selectedValues={collectionPeople}
          onChange={value => {
            let next: ContentPersonModel[];
            if (Array.isArray(value)) {
              next = value;
            } else if (value) {
              next = [value];
            } else {
              next = [];
            }
            setCollectionPeople(next);
          }}
          allowAddNew
          onAddNew={data => {
            const newPerson: ContentPersonModel = {
              id: 0,
              name: data.name as string,
              slug: '',
            };
            setCollectionPeople([...collectionPeople, newPerson]);
          }}
          addNewFields={PERSON_ADD_NEW_FIELDS}
          getDisplayName={person => person?.name || ''}
          showNewIndicator
          emptyText="No people set"
        />
        <div className={styles.actionRow}>
          <Button onClick={() => void handleSavePeople()} disabled={peopleSaving}>
            {peopleSaving ? 'Saving…' : 'Save People'}
          </Button>
          <Button onClick={() => void handleRegeneratePeople()} disabled={peopleSaving}>
            Regenerate from contents
          </Button>
        </div>
        {peopleStatus && (
          <p role="status" className={styles.statusMessage}>
            {peopleStatus}
          </p>
        )}
      </section>
    </div>
  );
}

export default TagsTab;
