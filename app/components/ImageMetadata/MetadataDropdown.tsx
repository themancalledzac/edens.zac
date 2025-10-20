'use client';

import { useState } from 'react';

import styles from './ImageMetadataModal.module.scss';

interface MetadataOption {
  id: number;
  name: string;
}

interface MetadataDropdownProps {
  label: string;
  options: MetadataOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
  allowAddNew?: boolean;
  onAddNew?: (newName: string) => void;
}

/**
 * Enhanced dropdown component for metadata selection
 * Features:
 * - Single or multi-select mode
 * - Add new items inline
 * - Visual feedback for selected items
 * - Accessible keyboard navigation
 */
export default function MetadataDropdown({
  label,
  options,
  selectedIds,
  onChange,
  multiSelect = false,
  placeholder = 'Select...',
  allowAddNew = false,
  onAddNew,
}: MetadataDropdownProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  // Get display text for selected items
  const getDisplayText = () => {
    if (selectedIds.length === 0) {
      return placeholder;
    }

    const selectedNames = options
      .filter(opt => selectedIds.includes(opt.id))
      .map(opt => opt.name);

    if (multiSelect) {
      return selectedNames.join(', ');
    }

    return selectedNames[0] || placeholder;
  };

  // Handle option toggle
  const handleToggle = (optionId: number) => {
    if (multiSelect) {
      // Multi-select: toggle the option
      if (selectedIds.includes(optionId)) {
        onChange(selectedIds.filter(id => id !== optionId));
      } else {
        onChange([...selectedIds, optionId]);
      }
    } else {
      // Single-select: replace selection
      onChange([optionId]);
    }
  };

  // Handle adding new item
  const handleAddNewSubmit = () => {
    const trimmedName = newItemName.trim();
    if (trimmedName && onAddNew) {
      onAddNew(trimmedName);
      setNewItemName('');
      setIsAddingNew(false);
    }
  };

  // Handle clear all (for multi-select)
  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className={styles.formGroup}>
      <div className={styles.dropdownHeader}>
        <label className={styles.formLabel}>{label}</label>
        <div className={styles.dropdownActions}>
          {multiSelect && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className={styles.clearButton}
            >
              Clear All
            </button>
          )}
          {allowAddNew && !isAddingNew && (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className={styles.addNewButton}
            >
              + Add New
            </button>
          )}
        </div>
      </div>

      {/* Add New Input */}
      {isAddingNew && (
        <div className={styles.addNewInput}>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddNewSubmit();
              } else if (e.key === 'Escape') {
                setIsAddingNew(false);
                setNewItemName('');
              }
            }}
            placeholder={`Enter new ${label.toLowerCase()}`}
            className={styles.formInput}
            autoFocus
          />
          <div className={styles.addNewButtons}>
            <button
              type="button"
              onClick={handleAddNewSubmit}
              className={styles.confirmButton}
              disabled={!newItemName.trim()}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setNewItemName('');
              }}
              className={styles.cancelSmallButton}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display selected items */}
      {selectedIds.length > 0 && (
        <div className={styles.selectedDisplay}>
          <span className={styles.selectedLabel}>Selected:</span>
          <span className={styles.selectedText}>{getDisplayText()}</span>
        </div>
      )}

      {/* Options List */}
      <div className={styles.optionsList}>
        {options.map((option) => {
          const isSelected = selectedIds.includes(option.id);
          return (
            <label
              key={option.id}
              className={`${styles.optionItem} ${isSelected ? styles.optionItemSelected : ''}`}
            >
              <input
                type={multiSelect ? 'checkbox' : 'radio'}
                checked={isSelected}
                onChange={() => handleToggle(option.id)}
                className={styles.optionInput}
              />
              <span className={styles.optionLabel}>{option.name}</span>
            </label>
          );
        })}

        {options.length === 0 && !isAddingNew && (
          <div className={styles.emptyState}>
            No {label.toLowerCase()} available.
            {allowAddNew && ' Click "Add New" to create one.'}
          </div>
        )}
      </div>
    </div>
  );
}