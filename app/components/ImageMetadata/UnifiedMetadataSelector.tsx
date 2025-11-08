'use client';

import { useState } from 'react';

import styles from './ImageMetadataModal.module.scss';

// ============================================================================
// Types
// ============================================================================

/**
 * Generic metadata item interface
 * All metadata items must have an optional id and a name/displayName
 * Additional properties are allowed for specialized items (e.g., defaultIso for film types)
 */
export interface MetadataItem {
  id?: number;
  name?: string;
  displayName?: string;
}

/**
 * Field configuration for "Add New" forms
 */
export interface AddNewField {
  name: string;
  label: string;
  type: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  min?: number;
}

/**
 * Props for UnifiedMetadataSelector component
 */
interface UnifiedMetadataSelectorProps<T extends MetadataItem> {
  // Basic configuration
  label: string;
  multiSelect: boolean;

  // Data
  options: T[];
  selectedValue?: T | null; // Single-select only
  selectedValues?: T[]; // Multi-select only

  // Callbacks
  onChange: (value: T | T[] | null) => void;

  // Add New functionality
  allowAddNew?: boolean;
  onAddNew?: (data: Record<string, string | number | null>) => void;
  addNewFields?: AddNewField[];

  // Display customization
  getDisplayName?: (item: T) => string; // Custom display text for items
  getItemKey?: (item: T) => string | number; // Custom key for list items
  emptyText?: string;
  changeButtonText?: string;
  addNewButtonText?: string;

  // Behavior
  showNewIndicator?: boolean; // Show "🔴 Will be added" for items not in database
  placeholder?: string; // Placeholder for add new inputs
}

/**
 * UnifiedMetadataSelector - A flexible dropdown selector for all metadata types
 *
 * Features:
 * - Single-select or multi-select modes
 * - Dropdown selection from existing items
 * - "Add New" functionality with custom form fields
 * - Visual indicators for new items
 * - Keyboard navigation support
 * - Highly customizable display and behavior
 *
 * @example Single-select (Camera)
 * <UnifiedMetadataSelector
 *   label="Camera"
 *   multiSelect={false}
 *   options={availableCameras}
 *   selectedValue={currentCamera}
 *   onChange={(camera) => handleCameraChange(camera)}
 *   allowAddNew={true}
 *   onAddNew={(data) => handleAddNewCamera(data.name)}
 * />
 *
 * @example Multi-select (Tags)
 * <UnifiedMetadataSelector
 *   label="Tags"
 *   multiSelect={true}
 *   options={allTags}
 *   selectedValues={selectedTags}
 *   onChange={(tags) => handleTagsChange(tags)}
 *   allowAddNew={true}
 *   onAddNew={(data) => handleAddNewTag(data.name)}
 *   changeButtonText="Select More ▼"
 * />
 */
export default function UnifiedMetadataSelector<T extends MetadataItem>({
  label,
  multiSelect,
  options,
  selectedValue,
  selectedValues = [],
  onChange,
  allowAddNew = false,
  onAddNew,
  addNewFields = [],
  getDisplayName,
  getItemKey,
  emptyText = `No ${label.toLowerCase()} set`,
  changeButtonText,
  addNewButtonText = '+ Add New',
  showNewIndicator = false,
  placeholder,
}: UnifiedMetadataSelectorProps<T>) {
  // ============================================================================
  // State
  // ============================================================================

  const [isSelectingFromDropdown, setIsSelectingFromDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Get display name for an item
   * Uses custom getter if provided, otherwise falls back to displayName or name
   */
  const getItemDisplayName = (item: T): string => {
    if (getDisplayName) return getDisplayName(item);
    return item.displayName || item.name || '';
  };

  /**
   * Get unique key for list items
   * Uses custom getter if provided, otherwise uses id or name
   */
  const getKey = (item: T): string | number => {
    if (getItemKey) return getItemKey(item);
    return item.id ?? item.name ?? '';
  };

  /**
   * Check if an item exists in the database (has a valid id > 0)
   */
  const itemExistsInDatabase = (item: T | null | undefined): boolean => {
    if (!item) return true;
    return Boolean(item.id && item.id > 0);
  };

  /**
   * Check if an item is selected (works for both single and multi-select)
   */
  const isItemSelected = (item: T): boolean => {
    if (multiSelect) {
      // Multi-select: check if item is in selectedValues array
      return selectedValues.some(selected => {
        if (selected.id && item.id) return selected.id === item.id;
        return getItemDisplayName(selected) === getItemDisplayName(item);
      });
    }
    // Single-select: compare with selectedValue
    if (!selectedValue) return false;
    if (selectedValue.id && item.id) return selectedValue.id === item.id;
    return getItemDisplayName(selectedValue) === getItemDisplayName(item);
  };


  /**
   * Determine button text based on mode
   */
  const getButtonText = (): string => {
    if (changeButtonText) return changeButtonText;
    return multiSelect ? 'Select More ▼' : 'Change ▼';
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle selecting an item from dropdown
   */
  const handleSelectItem = (item: T) => {
    if (multiSelect) {
      // Multi-select: toggle item in array
      const isCurrentlySelected = isItemSelected(item);
      if (isCurrentlySelected) {
        // Remove from selection
        const newSelection = selectedValues.filter(selected => {
          if (selected.id && item.id) return selected.id !== item.id;
          return getItemDisplayName(selected) !== getItemDisplayName(item);
        });
        onChange(newSelection);
      } else {
        // Add to selection
        onChange([...selectedValues, item]);
      }
    } else {
      // Single-select: replace selection and close dropdown
      onChange(item);
      setIsSelectingFromDropdown(false);
    }
  };

  /**
   * Handle removing an item from multi-select
   */
  const handleRemoveItem = (item: T) => {
    if (!multiSelect) return;

    const newSelection = selectedValues.filter(selected => {
      if (selected.id && item.id) return selected.id !== item.id;
      return getItemDisplayName(selected) !== getItemDisplayName(item);
    });
    onChange(newSelection);
  };

  /**
   * Handle adding a new item
   */
  const handleAddNew = () => {
    // Validate all required fields
    const missingFields = addNewFields
      .filter(field => field.required)
      .filter(field => !formData[field.name] || formData[field.name]?.toString().trim() === '');

    if (missingFields.length > 0) {
      return; // Button should be disabled, but this is extra safety
    }

    // Convert number fields to actual numbers
    const processedData: Record<string, string | number | null> = {};
    for (const field of addNewFields) {
      const value = formData[field.name];
      processedData[field.name] =
        field.type === 'number' && value
          ? Number.parseInt(value, 10)
          : value?.toString().trim() || null;
    }

    if (onAddNew) {
      onAddNew(processedData);
    }

    // Reset form
    setFormData({});
    setIsAddingNew(false);
  };

  /**
   * Check if Add New form is valid (all required fields filled)
   */
  const isAddNewFormValid = (): boolean => {
    return addNewFields
      .filter(field => field.required)
      .every(field => {
        const value = formData[field.name];
        if (!value) return false;
        if (field.type === 'number') {
          const numValue = Number.parseInt(value, 10);
          return !Number.isNaN(numValue) && numValue > 0;
        }
        return value?.toString().trim().length > 0;
      });
  };

  /**
   * Handle form field change
   */
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  /**
   * Handle keyboard events in form fields
   */
  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isAddNewFormValid()) {
        handleAddNew();
      }
    } else if (e.key === 'Escape') {
      setIsAddingNew(false);
      setFormData({});
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={styles.formGroup}>
      <label className={styles.formLabel}>{label}</label>

      {/* Current Selection Display */}
      <div className={styles.cameraDisplay}>
        <div className={styles.cameraValue}>
          {/* Single-select: Show current value or empty state */}
          {!multiSelect &&
            (selectedValue ? (
              <>
                {getItemDisplayName(selectedValue)}
                {showNewIndicator && !itemExistsInDatabase(selectedValue) && (
                  <span className={styles.cameraNewIndicator}>🔴 Will be added</span>
                )}
              </>
            ) : (
              <span className={styles.cameraEmpty}>{emptyText}</span>
            ))}

          {/* Multi-select: Show selected items as chips */}
          {multiSelect &&
            (selectedValues.length === 0 ? (
              <span className={styles.cameraEmpty}>{emptyText}</span>
            ) : (
              <div className={styles.selectedChips}>
                {selectedValues.map(item => (
                  <div key={getKey(item)} className={styles.chip}>
                    <span>{getItemDisplayName(item)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item)}
                      className={styles.chipRemove}
                      aria-label={`Remove ${getItemDisplayName(item)}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </div>

        {/* Action Buttons */}
        <div className={styles.cameraActions}>
          <button
            type="button"
            onClick={() => {
              setIsSelectingFromDropdown(!isSelectingFromDropdown);
              setIsAddingNew(false);
            }}
            className={styles.cameraChangeButton}
          >
            {isSelectingFromDropdown ? 'Close' : getButtonText()}
          </button>
          {allowAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(!isAddingNew);
                setIsSelectingFromDropdown(false);
              }}
              className={styles.cameraAddButton}
            >
              {isAddingNew ? 'Close' : addNewButtonText}
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Selection */}
      {isSelectingFromDropdown && (
        <div className={styles.cameraDropdownList}>
          {options.length > 0 ? (
            options.map(item => {
              const isSelected = isItemSelected(item);
              return (
                <button
                  key={getKey(item)}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  className={`${styles.cameraDropdownItem} ${
                    isSelected ? styles.cameraDropdownItemActive : ''
                  }`}
                >
                  {getItemDisplayName(item)}
                  {isSelected && ' ✓'}
                </button>
              );
            })
          ) : (
            <div className={styles.cameraDropdownEmpty}>
              No {label.toLowerCase()} available.
              {allowAddNew && ' Click "Add New" to create one.'}
            </div>
          )}
        </div>
      )}

      {/* Add New Form */}
      {isAddingNew && (
        <div className={styles.addNewInput}>
          {addNewFields.map((field, index) => (
            <div key={field.name} className={styles.formGroup}>
              <label className={styles.formLabel}>{field.label}</label>
              <input
                type={field.type}
                value={formData[field.name] || ''}
                onChange={e => handleFieldChange(field.name, e.target.value)}
                onKeyDown={handleFieldKeyDown}
                placeholder={field.placeholder || placeholder || `Enter ${field.label.toLowerCase()}`}
                className={styles.formInput}
                min={field.type === 'number' ? field.min : undefined}
                autoFocus={index === 0}
              />
            </div>
          ))}

          <div className={styles.addNewButtons}>
            <button
              type="button"
              onClick={handleAddNew}
              className={styles.confirmButton}
              disabled={!isAddNewFormValid()}
            >
              {multiSelect ? `Add ${label}` : `Set ${label}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(false);
                setFormData({});
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
