'use client';

import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import type { ContentTagModel } from '@/app/types/ImageMetadata';

export interface TagsSelectorProps {
  /** Currently-selected tags (resolved to full models; id === 0 means not-yet-created). */
  selectedTags: ContentTagModel[];
  /** All known tags, used as the dropdown options. */
  availableTags: ContentTagModel[];
  /** Called with the full next selection whenever tags are added/removed. */
  onChange: (tags: ContentTagModel[]) => void;
  /** Dropdown label. Defaults to "Tags". */
  label?: string;
  /** Placeholder shown when no tags are selected. Defaults to "No tags selected". */
  emptyText?: string;
}

/**
 * Shared tag multi-select. Wraps the generic {@link Dropdown} with the tag-specific
 * config (add-new "Tag Name" field, display-by-name) and normalizes its output to a
 * `ContentTagModel[]`.
 *
 * Reused by both image editing (TagsPeopleSection) and the collection manage page so the
 * tag-picker UX stays identical across surfaces.
 */
export default function TagsSelector({
  selectedTags,
  availableTags,
  onChange,
  label = 'Tags',
  emptyText = 'No tags selected',
}: TagsSelectorProps): React.JSX.Element {
  return (
    <Dropdown<ContentTagModel>
      label={label}
      multiSelect
      options={availableTags}
      selectedValues={selectedTags}
      onChange={value => {
        const tags = (value as ContentTagModel[] | null) ?? [];
        onChange(tags);
      }}
      allowAddNew
      onAddNew={data => {
        const newTag: ContentTagModel = { id: 0, name: data.name as string, slug: '' };
        onChange([...selectedTags, newTag]);
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
      emptyText={emptyText}
    />
  );
}
