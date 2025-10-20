'use client';

import { useState } from 'react';

import styles from './ImageMetadataModal.module.scss';

export interface NewFilmStockData {
  filmTypeName: string;
  defaultIso: number;
}

interface FilmStockSelectorProps {
  currentFilmStock: string;
  availableFilmTypes: Array<{ id?: number; name: string; displayName: string; defaultIso: number }>;
  onChange: (filmTypeName: string, filmTypeId?: number) => void;
  onAddNew: (newFilmStock: NewFilmStockData) => void;
}

/**
 * Film Stock selector component for Camera Settings section (when isFilm is true)
 *
 * Features:
 * - Displays current film stock as static text
 * - Dropdown to select from existing film types
 * - "Add New" button to create new film stock
 * - Shows indicator if current film stock will be added to database
 */
export default function FilmStockSelector({
  currentFilmStock,
  availableFilmTypes,
  onChange,
  onAddNew,
}: FilmStockSelectorProps) {
  const [isSelectingFromDropdown, setIsSelectingFromDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newFilmTypeName, setNewFilmTypeName] = useState('');
  const [newDefaultIso, setNewDefaultIso] = useState('');

  // Check if current film stock exists in available film types
  const filmStockExistsInDatabase = currentFilmStock
    ? availableFilmTypes.some(f => f.name.toLowerCase() === currentFilmStock.toLowerCase())
    : true; // If no film stock, don't show indicator

  // Handle selecting from dropdown
  const handleSelectFilmStock = (filmTypeName: string, filmTypeId?: number) => {
    onChange(filmTypeName, filmTypeId);
    setIsSelectingFromDropdown(false);
  };

  // Handle adding new film stock
  const handleAddNew = () => {
    const trimmedFilmTypeName = newFilmTypeName.trim();
    const isoValue = Number.parseInt(newDefaultIso, 10);

    if (trimmedFilmTypeName && isoValue > 0) {
      onAddNew({
        filmTypeName: trimmedFilmTypeName,
        defaultIso: isoValue,
      });
      setNewFilmTypeName('');
      setNewDefaultIso('');
      setIsAddingNew(false);
    }
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>Film Stock</label>

      {/* Current Film Stock Display */}
      <div className={styles.cameraDisplay}>
        <div className={styles.cameraValue}>
          {currentFilmStock || <span className={styles.cameraEmpty}>No film stock set</span>}
          {currentFilmStock && !filmStockExistsInDatabase && (
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
          {availableFilmTypes.length > 0 ? (
            availableFilmTypes.map((filmType) => (
              <button
                key={filmType.name}
                type="button"
                onClick={() => handleSelectFilmStock(filmType.name, filmType.id)}
                className={`${styles.cameraDropdownItem} ${
                  filmType.name === currentFilmStock ? styles.cameraDropdownItemActive : ''
                }`}
              >
                {filmType.displayName} (ISO {filmType.defaultIso})
                {filmType.name === currentFilmStock && ' ✓'}
              </button>
            ))
          ) : (
            <div className={styles.cameraDropdownEmpty}>
              No film stocks available. Click "Add New" to create one.
            </div>
          )}
        </div>
      )}

      {/* Add New Input */}
      {isAddingNew && (
        <div className={styles.addNewInput}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Film Stock Name</label>
            <input
              type="text"
              value={newFilmTypeName}
              onChange={(e) => setNewFilmTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNew();
                } else if (e.key === 'Escape') {
                  setIsAddingNew(false);
                  setNewFilmTypeName('');
                  setNewDefaultIso('');
                }
              }}
              placeholder="e.g., Kodak Portra 400"
              className={styles.formInput}
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Default ISO</label>
            <input
              type="number"
              value={newDefaultIso}
              onChange={(e) => setNewDefaultIso(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNew();
                } else if (e.key === 'Escape') {
                  setIsAddingNew(false);
                  setNewFilmTypeName('');
                  setNewDefaultIso('');
                }
              }}
              placeholder="e.g., 400"
              className={styles.formInput}
              min="0"
            />
          </div>

          <div className={styles.addNewButtons}>
            <button
              type="button"
              onClick={handleAddNew}
              className={styles.confirmButton}
              disabled={!newFilmTypeName.trim() || !newDefaultIso || Number.parseInt(newDefaultIso, 10) <= 0}
            >
              Add Film Stock
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setNewFilmTypeName('');
                setNewDefaultIso('');
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