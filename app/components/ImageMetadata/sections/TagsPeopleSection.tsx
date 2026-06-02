'use client';

import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
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

      <Dropdown<ContentTagModel>
        label="Tags"
        multiSelect
        options={availableTags}
        selectedValues={updateState.tags || []}
        onChange={value => {
          const tags = (value as ContentTagModel[] | null) ?? [];
          updateStateField({ tags });
        }}
        allowAddNew
        onAddNew={data => {
          const newTag: ContentTagModel = { id: 0, name: data.name as string, slug: '' };
          const currentTags = updateState.tags || [];
          updateStateField({ tags: [...currentTags, newTag] });
        }}
        addNewFields={[
          {
            name: 'name',
            label: 'Tag Name',
            type: 'text',
            placeholder: 'Enter new tag',
            required: true,
          },
        ]}
        getDisplayName={tag => tag.name}
        emptyText="No tags selected"
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
