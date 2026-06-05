'use client';

import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import TagsSelector from '@/app/components/ui/TagsSelector/TagsSelector';
import type { ContentPersonModel, ContentTagModel } from '@/app/types/ImageMetadata';

import type { ImageUpdateState } from '../hooks/useImageMetadataState';
import modalStyles from '../ImageMetadataModal.module.scss';

export interface TagsPeopleSectionProps {
  updateState: ImageUpdateState;
  updateStateField: (updates: Partial<ImageUpdateState>) => void;
  availableTags: ContentTagModel[];
  availablePeople: ContentPersonModel[];
}

export default function TagsPeopleSection({
  updateState,
  updateStateField,
  availableTags,
  availablePeople,
}: TagsPeopleSectionProps): React.JSX.Element {
  return (
    <div className={modalStyles.formSection}>
      <h3 className={modalStyles.sectionHeading}>Tags & People</h3>

      <TagsSelector
        selectedTags={updateState.tags || []}
        availableTags={availableTags}
        onChange={tags => updateStateField({ tags })}
      />

      <div>
        <Dropdown<ContentPersonModel>
          label="People"
          multiSelect
          options={availablePeople}
          selectedValues={updateState.people || []}
          onChange={value => {
            const people = (value as ContentPersonModel[] | null) ?? [];
            updateStateField({ people });
          }}
          allowAddNew
          onAddNew={data => {
            const newPerson: ContentPersonModel = {
              id: 0,
              name: data.name as string,
              slug: '',
            };
            const currentPeople = updateState.people || [];
            updateStateField({ people: [...currentPeople, newPerson] });
          }}
          addNewFields={[
            {
              name: 'name',
              label: 'Person Name',
              type: 'text',
              placeholder: 'Enter person name',
              required: true,
            },
          ]}
          getDisplayName={person => person.name}
          emptyText="No people selected"
        />
      </div>
    </div>
  );
}
