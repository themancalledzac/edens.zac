'use client';

import Dropdown from '@/app/components/ui/Dropdown/Dropdown';
import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { Textarea } from '@/app/components/ui/Field/Textarea';
import type { CollectionListModel, LocationModel } from '@/app/types/Collection';

import type { ImageUpdateState } from '../hooks/useImageMetadataState';
import modalStyles from '../ImageMetadataModal.module.scss';
import localStyles from './EssentialInfoSection.module.scss';

export interface EssentialInfoSectionProps {
  updateState: ImageUpdateState;
  updateStateField: (updates: Partial<ImageUpdateState>) => void;
  availableLocations: LocationModel[];
  availableCollections: CollectionListModel[];
  currentCollectionId?: number;
  /** Controls the disabled state on the Caption field — GIF/MP4 content does not support captions. */
  isGif: boolean;
}

export default function EssentialInfoSection({
  updateState,
  updateStateField,
  availableLocations,
  availableCollections,
  currentCollectionId,
  isGif,
}: EssentialInfoSectionProps): React.JSX.Element {
  return (
    <div className={modalStyles.formSection}>
      <h3 className={modalStyles.sectionHeading}>Essential Information</h3>

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
        className={[modalStyles.formGroup, isGif ? localStyles.sectionDisabled : '']
          .filter(Boolean)
          .join(' ')}
        aria-disabled={isGif}
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

      <div className={modalStyles.formGroup}>
        <label className={modalStyles.formLabel}>Author</label>
        <Input
          value={updateState.author ?? ''}
          onChange={e => updateStateField({ author: e.target.value || null })}
          className={modalStyles.formInput}
          placeholder="Photographer name"
        />
      </div>

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
          addNewFields={[
            {
              name: 'name',
              label: 'Location Name',
              type: 'text',
              placeholder: 'e.g., Seattle, WA',
              required: true,
            },
          ]}
          getDisplayName={location => location?.name || ''}
          showNewIndicator
          emptyText="No locations set"
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
          <option value="">No rating</option>
          <option value="1">1 Star</option>
          <option value="2">2 Stars</option>
          <option value="3">3 Stars</option>
          <option value="4">4 Stars</option>
          <option value="5">5 Stars</option>
        </Select>
      </div>

      {/* Collection Visibility — available for both single and bulk edit */}
      {currentCollectionId && (
        <div className={modalStyles.checkboxGroup}>
          <label className={modalStyles.checkboxLabel}>
            <Checkbox
              checked={(() => {
                const currentCollection = updateState.collections?.find(
                  c => c.collectionId === currentCollectionId
                );
                return currentCollection?.visible !== false;
              })()}
              onChange={e => {
                const currentCollections = updateState.collections || [];
                const collectionIndex = currentCollections.findIndex(
                  c => c.collectionId === currentCollectionId
                );

                let updatedCollections: Array<{
                  collectionId: number;
                  name?: string;
                  visible?: boolean;
                  orderIndex?: number;
                }>;

                if (collectionIndex >= 0) {
                  updatedCollections = currentCollections.map((c, idx) =>
                    idx === collectionIndex ? { ...c, visible: e.target.checked } : c
                  );
                } else {
                  const collectionName = availableCollections.find(
                    c => c.id === currentCollectionId
                  )?.name;
                  updatedCollections = [
                    ...currentCollections,
                    {
                      collectionId: currentCollectionId,
                      name: collectionName,
                      visible: e.target.checked,
                      orderIndex: currentCollections.length,
                    },
                  ];
                }

                updateStateField({ collections: updatedCollections });
              }}
            />
            <span>Collection Visibility</span>
          </label>
        </div>
      )}
    </div>
  );
}
