'use client';

import { useState } from 'react';

import { type ContentCameraModel } from '@/app/types/ImageMetadata';

import styles from './ImageMetadataModal.module.scss';

interface CameraSelectorProps {
  currentCamera: ContentCameraModel | null;
  availableCameras: Array<ContentCameraModel>;
  onChange: (camera: ContentCameraModel | null, isNewCamera: boolean) => void;
}

/**
 * Camera selector component for Camera Settings section
 *
 * Features:
 * - Displays current camera as static text
 * - Dropdown to select from existing cameras
 * - "Add New" button to create new camera
 * - Shows indicator if current camera will be added to database
 */
export default function CameraSelector({
  currentCamera,
  availableCameras,
  onChange,
}: CameraSelectorProps) {
  const [isSelectingFromDropdown, setIsSelectingFromDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCameraName, setNewCameraName] = useState('');

  // Check if current camera exists in available cameras
  const cameraExistsInDatabase = currentCamera
    ? availableCameras.some(c => c.cameraName.toLowerCase() === currentCamera.cameraName.toLowerCase())
    : true; // If no camera, don't show indicator

  // Handle selecting from dropdown - pass existing camera with ID
  const handleSelectCamera = (camera: ContentCameraModel) => {
    onChange(camera, false); // Not a new camera
    setIsSelectingFromDropdown(false);
  };

  // Handle adding new camera - pass camera object without ID (will be created)
  const handleAddNew = () => {
    const trimmedName = newCameraName.trim();
    if (trimmedName) {
      // Create a new camera object without an ID (backend will assign one)
      const newCamera: ContentCameraModel = {
        id: 0, // Temporary ID, backend will assign real one
        cameraName: trimmedName,
      };
      onChange(newCamera, true); // This is a new camera
      setNewCameraName('');
      setIsAddingNew(false);
    }
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Camera</label>

      {/* Current Camera Display */}
      <div className={styles.cameraDisplay}>
        <div className={styles.cameraValue}>
          {currentCamera?.cameraName || <span className={styles.cameraEmpty}>No camera set</span>}
          {currentCamera && !cameraExistsInDatabase && (
            <span className={styles.cameraNewIndicator}>🔴 Will be added</span>
          )}
        </div>

        <div className={styles.cameraActions}>
          <button
            type="button"
            onClick={() => {
              setIsSelectingFromDropdown(!isSelectingFromDropdown);
              setIsAddingNew(false);
            }}
            className={styles.cameraChangeButton}
          >
            {isSelectingFromDropdown ? 'Cancel' : 'Change ▼'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingNew(!isAddingNew);
              setIsSelectingFromDropdown(false);
            }}
            className={styles.cameraAddButton}
          >
            {isAddingNew ? 'Cancel' : '+ Add New'}
          </button>
        </div>
      </div>

      {/* Dropdown Selection */}
      {isSelectingFromDropdown && (
        <div className={styles.cameraDropdownList}>
          {availableCameras.length > 0 ? (
            availableCameras.map((camera) => (
              <button
                key={camera.id}
                type="button"
                onClick={() => handleSelectCamera(camera)}
                className={`${styles.cameraDropdownItem} ${
                  currentCamera && camera.cameraName === currentCamera.cameraName ? styles.cameraDropdownItemActive : ''
                }`}
              >
                {camera.cameraName}
                {currentCamera && camera.cameraName === currentCamera.cameraName && ' ✓'}
              </button>
            ))
          ) : (
            <div className={styles.cameraDropdownEmpty}>
              No cameras available. Click "Add New" to create one.
            </div>
          )}
        </div>
      )}

      {/* Add New Input */}
      {isAddingNew && (
        <div className={styles.addNewInput}>
          <input
            type="text"
            value={newCameraName}
            onChange={(e) => setNewCameraName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNew();
              } else if (e.key === 'Escape') {
                setIsAddingNew(false);
                setNewCameraName('');
              }
            }}
            placeholder="Enter camera name (e.g., Canon EOS R5)"
            className={styles.formInput}
            autoFocus
          />
          <div className={styles.addNewButtons}>
            <button
              type="button"
              onClick={handleAddNew}
              className={styles.confirmButton}
              disabled={!newCameraName.trim()}
            >
              Set Camera
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setNewCameraName('');
              }}
              className={styles.cancelSmallButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
