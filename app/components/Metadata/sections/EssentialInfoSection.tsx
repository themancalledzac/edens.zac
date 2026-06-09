'use client';

import { LOCATION_ADD_NEW_FIELDS } from '@/app/components/ui/Dropdown/commonAddNewFields';
import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import type { CollectionListModel, LocationModel } from '@/app/types/Collection';

import type { ImageUpdateState } from '../hooks/useMetadataState';
import modalStyles from '../MetadataModal.module.scss';
import { isCurrentCollectionVisible, toggleCollectionVisibility } from './essentialInfoUtils';

// ---------------------------------------------------------------------------
// Static option list for the Rating <Select>. Hoisted out of the render path
// because it doesn't reference any component-scope identifier. Per the project
// "inline JSX config" rule (ai_guidelines/ai_quick_reference.md).
// ---------------------------------------------------------------------------

const RATING_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: 'No rating' },
  { value: '1', label: '1 Star' },
  { value: '2', label: '2 Stars' },
  { value: '3', label: '3 Stars' },
  { value: '4', label: '4 Stars' },
  { value: '5', label: '5 Stars' },
];

export interface EssentialInfoSectionProps {
  updateState: ImageUpdateState;
  updateStateField: (updates: Partial<ImageUpdateState>) => void;
  availableLocations: LocationModel[];
  availableCollections: CollectionListModel[];
  currentCollectionId?: number;
  /** Controls the disabled state on the Caption field — GIF/MP4 content does not support captions. */
  isGif: boolean;
  /** Bulk edit hides per-item fields (Title/Caption/Alt) that should never be shared across images. */
  isBulkEdit?: boolean;
}

export default function EssentialInfoSection({
  updateState,
  updateStateField,
  availableLocations,
  availableCollections,
  currentCollectionId,
  isGif,
  isBulkEdit = false,
}: EssentialInfoSectionProps): React.JSX.Element {
  // Visibility of the current collection's junction. Absent/undefined means "visible" (only an
  // explicit `false` hides it), matching the backend default.
  const currentCollectionVisible = isCurrentCollectionVisible(
    updateState.collections,
    currentCollectionId
  );

  // Toggle the current collection's `visible` flag in updateState — updating the existing junction
  // in place, or appending one when the image isn't in this collection's list yet.
  const handleCollectionVisibilityToggle = (checked: boolean) => {
    if (currentCollectionId == null) return;
    updateStateField({
      collections: toggleCollectionVisibility(
        updateState.collections,
        currentCollectionId,
        checked,
        availableCollections
      ),
    });
  };

  return (
    <div className={modalStyles.formSection}>
      <h3 className={modalStyles.sectionHeading}>Essential Information</h3>

      {/* Per-item fields — hidden in bulk edit (multiple images never share these). */}
      {!isBulkEdit && (
        <>
          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Title</label>
            <Input
              value={updateState.title ?? ''}
              onChange={e => updateStateField({ title: e.target.value || undefined })}
              className={modalStyles.formInput}
              placeholder="Enter image title"
            />
          </div>

          <div
            className={[modalStyles.formGroup, isGif ? modalStyles.sectionDisabled : '']
              .filter(Boolean)
              .join(' ')}
            aria-disabled={isGif || undefined}
            title={isGif ? 'Caption is not supported on GIF/MP4 content.' : undefined}
          >
            <label className={modalStyles.formLabel}>Caption</label>
            <Textarea
              value={updateState.caption ?? ''}
              onChange={e => updateStateField({ caption: e.target.value || undefined })}
              className={modalStyles.formTextarea}
              placeholder="Enter caption"
              rows={3}
              disabled={isGif}
            />
          </div>

          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Alt Text (Accessibility)</label>
            <Input
              value={updateState.alt ?? ''}
              onChange={e => updateStateField({ alt: e.target.value || undefined })}
              className={modalStyles.formInput}
              placeholder="Describe the image for screen readers"
            />
          </div>
        </>
      )}

      <div>
        <Dropdown<LocationModel>
          label="Locations"
          multiSelect
          options={availableLocations}
          selectedValues={updateState.locations ?? []}
          onChange={value => {
            let locations: LocationModel[];
            if (Array.isArray(value)) {
              locations = value;
            } else if (value) {
              locations = [value];
            } else {
              locations = [];
            }
            updateStateField({ locations });
          }}
          allowAddNew
          onAddNew={data => {
            const newLocation = { id: 0, name: data.name as string, slug: '' };
            updateStateField({
              locations: [...(updateState.locations ?? []), newLocation],
            });
          }}
          addNewFields={LOCATION_ADD_NEW_FIELDS}
          getDisplayName={location => location?.name || ''}
          showNewIndicator
          emptyText="No locations set"
        />
      </div>

      {/* Author · Rating · Collection Visibility — compact half-width siblings to save space. */}
      <div className={modalStyles.formGridHalf}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>Author</label>
          <Input
            value={updateState.author ?? ''}
            onChange={e => updateStateField({ author: e.target.value || null })}
            className={modalStyles.formInput}
            placeholder="Photographer name"
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>Rating</label>
          <Select
            value={updateState.rating?.toString() || ''}
            onChange={e =>
              updateStateField({
                rating: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              })
            }
            className={modalStyles.formSelect}
          >
            {RATING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Collection Visibility — available for both single and bulk edit */}
        {currentCollectionId && (
          <div className={modalStyles.checkboxGroup}>
            <label className={modalStyles.checkboxLabel}>
              <Checkbox
                checked={currentCollectionVisible}
                onChange={e => handleCollectionVisibilityToggle(e.target.checked)}
              />
              <span>Collection Visibility</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
