'use client';

import { type JSX, useState } from 'react';

import Dropdown, { type AddNewField } from '@/app/components/ui/Dropdown/Dropdown';
import { Checkbox } from '@/app/components/ui/Field/Checkbox';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { createCamera } from '@/app/lib/api/content';
import type {
  ContentCameraModel,
  ContentFilmTypeModel,
  ContentLensModel,
  FilmFormatDTO,
} from '@/app/types/Metadata';
import { logger } from '@/app/utils/logger';

import type { ImageUpdateState } from '../hooks/useMetadataState';
import modalStyles from '../MetadataModal.module.scss';
import { computeCameraSelectionUpdate } from '../metadataUtils';

/**
 * Static add-new-field schema, hoisted out of the render path because it references no
 * component-scope identifier (props, state or closures). Follows the inline JSX config rule in
 * CLAUDE.md.
 */
const LENS_ADD_NEW_FIELDS: AddNewField[] = [
  {
    name: 'name',
    label: 'Lens Name',
    type: 'text',
    placeholder: 'e.g., 24-70mm f/2.8',
    required: true,
  },
];

const FILM_STOCK_ADD_NEW_FIELDS: AddNewField[] = [
  {
    name: 'name',
    label: 'Film Stock Name',
    type: 'text',
    placeholder: 'e.g., Kodak Portra 400',
    required: true,
  },
  {
    name: 'defaultIso',
    label: 'Default ISO',
    type: 'number',
    placeholder: 'e.g., 400',
    required: true,
    min: 1,
  },
];

/**
 * Camera's add-new schema needs a props-derived field (film-format options),
 * so it's a builder, not a const. Static parts of each field still don't move
 * per call; only the `options` list re-derives when `availableFilmFormats` changes.
 */
const buildCameraAddNewFields = (availableFilmFormats: FilmFormatDTO[]): AddNewField[] => [
  {
    name: 'cameraName',
    label: 'Camera Name',
    type: 'text',
    placeholder: 'e.g., Hasselblad 500cm',
    required: true,
  },
  {
    name: 'isFilm',
    label: 'Film Camera',
    type: 'checkbox',
  },
  {
    name: 'defaultFilmFormat',
    label: 'Film Format',
    type: 'select',
    options: availableFilmFormats.map(f => ({
      value: f.name,
      label: f.displayName,
    })),
    showWhen: data => data.isFilm === true,
    placeholder: 'Select format',
  },
];

export interface CameraSettingsSectionProps {
  updateState: ImageUpdateState;
  updateStateField: (updates: Partial<ImageUpdateState>) => void;
  /**
   * Guarded swap/revert for the optimistic add-new camera. Only mutates the
   * selection when it is still the `{ id: 0 }` placeholder — see
   * `useMetadataState.replaceOptimisticCamera`.
   */
  replaceOptimisticCamera: (optimisticName: string, replacement: ContentCameraModel | null) => void;
  availableCameras: ContentCameraModel[];
  availableLenses: ContentLensModel[];
  availableFilmTypes: ContentFilmTypeModel[];
  availableFilmFormats: FilmFormatDTO[];
  /** When true the entire section is greyed out — GIF/MP4 content has no EXIF metadata. */
  isGif: boolean;
}

/**
 * Camera is the only add-new picker that saves before the form does. The save-time diff would drop
 * `isFilm` and `defaultFilmFormat`, so it POSTs the camera right away and swaps the optimistic
 * `{ id: 0 }` entry for the server one. A null response is a 204 success and keeps the optimistic
 * entry. On failure it reverts to the prior camera and sets `createError`. Both swaps skip if the
 * user picked a different camera in the meantime.
 */
export default function CameraSettingsSection({
  updateState,
  updateStateField,
  replaceOptimisticCamera,
  availableCameras,
  availableLenses,
  availableFilmTypes,
  availableFilmFormats,
  isGif,
}: CameraSettingsSectionProps): JSX.Element {
  const [createError, setCreateError] = useState<string | null>(null);

  return (
    <div
      className={[modalStyles.formSection, isGif ? modalStyles.sectionDisabled : '']
        .filter(Boolean)
        .join(' ')}
      aria-disabled={isGif || undefined}
      title={isGif ? 'Camera/EXIF metadata is not supported on GIF/MP4 content.' : undefined}
    >
      <h3 className={modalStyles.sectionHeading}>Camera Settings</h3>

      <Dropdown<ContentCameraModel>
        label="Camera"
        multiSelect={false}
        options={availableCameras}
        selectedValue={updateState.camera || null}
        onChange={value => {
          const camera = Array.isArray(value) ? value[0] || null : value;
          updateStateField(computeCameraSelectionUpdate(camera, updateState));
        }}
        allowAddNew
        onAddNew={data => {
          const cameraName = (data.cameraName as string | null) ?? '';
          if (!cameraName.trim()) return;
          const trimmedName = cameraName.trim();
          const isFilm = data.isFilm === true;
          const defaultFilmFormat = isFilm
            ? ((data.defaultFilmFormat as string | null) ?? null)
            : null;
          const previousCamera = updateState.camera ?? null;
          setCreateError(null);
          const optimisticCamera: ContentCameraModel = {
            id: 0,
            name: trimmedName,
            isFilm,
            defaultFilmFormat,
          };
          updateStateField(computeCameraSelectionUpdate(optimisticCamera, updateState));
          void createCamera({ cameraName: trimmedName, isFilm, defaultFilmFormat })
            .then(created => {
              if (!created) return;
              replaceOptimisticCamera(trimmedName, {
                id: created.id,
                name: created.cameraName,
                isFilm: created.isFilm,
                defaultFilmFormat,
              });
            })
            .catch(error_ => {
              logger.error('CameraSettingsSection', 'Failed to create camera', error_);
              replaceOptimisticCamera(trimmedName, previousCamera);
              setCreateError(`Couldn't save camera "${trimmedName}". Please try again.`);
            });
        }}
        addNewFields={buildCameraAddNewFields(availableFilmFormats)}
        getDisplayName={camera => camera.name}
        showNewIndicator
        emptyText="No camera set"
      />

      {createError && (
        <div className={modalStyles.errorMessage} role="alert">
          {createError}
        </div>
      )}

      <Dropdown<ContentLensModel>
        label="Lens"
        multiSelect={false}
        options={availableLenses}
        selectedValue={updateState.lens || null}
        onChange={value => {
          const lens = Array.isArray(value) ? value[0] || null : value;
          updateStateField({ lens: lens || null });
        }}
        allowAddNew
        onAddNew={data => {
          updateStateField({ lens: { id: 0, name: data.name as string } });
        }}
        addNewFields={LENS_ADD_NEW_FIELDS}
        getDisplayName={lens => lens.name}
        showNewIndicator
        emptyText="No lens set"
      />

      <div className={modalStyles.formGrid2Col}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>ISO</label>
          <Input
            type="number"
            value={updateState.iso?.toString() || ''}
            onChange={e =>
              updateStateField({
                iso: e.target.value ? Number.parseInt(e.target.value, 10) : undefined,
              })
            }
            className={modalStyles.formInput}
            placeholder="e.g., 800"
            min="0"
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>F-Stop</label>
          <Input
            type="text"
            value={updateState.fStop ?? ''}
            onChange={e => updateStateField({ fStop: e.target.value || null })}
            className={modalStyles.formInput}
            placeholder="e.g., f/2.8"
          />
        </div>
      </div>

      <div className={modalStyles.formGrid2Col}>
        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>Shutter Speed</label>
          <Input
            type="text"
            value={updateState.shutterSpeed ?? ''}
            onChange={e => updateStateField({ shutterSpeed: e.target.value || null })}
            className={modalStyles.formInput}
            placeholder="e.g., 1/250 sec"
          />
        </div>

        <div className={modalStyles.formGroup}>
          <label className={modalStyles.formLabel}>Focal Length</label>
          <Input
            type="text"
            value={updateState.focalLength ?? ''}
            onChange={e => updateStateField({ focalLength: e.target.value || null })}
            className={modalStyles.formInput}
            placeholder="e.g., 50 mm"
          />
        </div>
      </div>

      <div className={modalStyles.checkboxGroup}>
        <label className={modalStyles.checkboxLabel}>
          <Checkbox
            checked={updateState.blackAndWhite ?? false}
            onChange={e => updateStateField({ blackAndWhite: e.target.checked })}
          />
          <span>Black & White</span>
        </label>

        <label className={modalStyles.checkboxLabel}>
          <Checkbox
            checked={updateState.isFilm ?? false}
            onChange={e => updateStateField({ isFilm: e.target.checked })}
          />
          <span>Film Photography</span>
        </label>
      </div>

      {updateState.isFilm && (
        <div className={modalStyles.formGrid2Col}>
          <Dropdown<ContentFilmTypeModel>
            label="Film Stock"
            multiSelect={false}
            options={availableFilmTypes}
            selectedValue={
              updateState.filmType
                ? availableFilmTypes.find(f => f.name === updateState.filmType) || null
                : null
            }
            onChange={value => {
              const filmStock = Array.isArray(value) ? value[0] || null : value;
              if (!filmStock) {
                updateStateField({ filmType: undefined, iso: undefined });
              } else {
                updateStateField({
                  filmType: filmStock.name,
                  iso: filmStock.defaultIso,
                });
              }
            }}
            allowAddNew
            onAddNew={data => {
              const filmTypeName = data.name as string;
              const defaultIso = data.defaultIso as number;
              updateStateField({
                filmType: filmTypeName,
                iso: defaultIso,
              });
            }}
            addNewFields={FILM_STOCK_ADD_NEW_FIELDS}
            getDisplayName={film => `${film.name} (ISO ${film.defaultIso})`}
            showNewIndicator
            emptyText="No film stock set"
          />

          <div className={modalStyles.formGroup}>
            <label className={modalStyles.formLabel}>Film Format</label>
            <Select
              value={updateState.filmFormat ?? ''}
              onChange={e => updateStateField({ filmFormat: e.target.value || null })}
              className={modalStyles.formSelect}
            >
              <option value="">Select format</option>
              {availableFilmFormats.map(format => (
                <option key={format.name} value={format.name}>
                  {format.displayName}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
