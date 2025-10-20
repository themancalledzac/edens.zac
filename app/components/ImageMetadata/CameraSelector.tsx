'use client';

import { useState } from 'react';

import styles from './ImageMetadataModal.module.scss';

interface CameraSelectorProps {
  currentCamera: string;
  availableCameras: Array<{ id: number; name: string }>;
  onChange: (cameraName: string) => void;
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
    ? availableCameras.some(c => c.name.toLowerCase() === currentCamera.toLowerCase())
    : true; // If no camera, don't show indicator

  // Handle selecting from dropdown
  const handleSelectCamera = (cameraName: string) => {
    onChange(cameraName);
    setIsSelectingFromDropdown(false);
  };

  // Handle adding new camera
  const handleAddNew = () => {
    const trimmedName = newCameraName.trim();
    if (trimmedName) {
      onChange(trimmedName);
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
          {currentCamera || <span className={styles.cameraEmpty}>No camera set</span>}
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
                onClick={() => handleSelectCamera(camera.name)}
                className={`${styles.cameraDropdownItem} ${
                  camera.name === currentCamera ? styles.cameraDropdownItemActive : ''
                }`}
              >
                {camera.name}
                {camera.name === currentCamera && ' ✓'}
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
