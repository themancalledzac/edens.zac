'use client';

import { Plus } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { useClickOutsideMultiple } from '@/app/hooks/useClickOutside';

import styles from './Dropdown.module.scss';

/**
 * Generic metadata item interface.
 * All metadata items must have an optional id and a name/displayName.
 * Additional properties are allowed for specialized items (e.g., defaultIso for film types).
 */
export interface MetadataItem {
  id?: number;
  name?: string;
  displayName?: string;
}

/**
 * Field configuration for "Add New" forms.
 *
 * - `text` / `number` render a plain input.
 * - `checkbox` renders a labelled checkbox. `required` is ignored for checkboxes.
 * - `select` renders a `<select>` driven by `options`. `required: true` means
 *   the empty value cannot be submitted.
 * - `showWhen` is an optional predicate evaluated against the live form data;
 *   when it returns `false`, the field is not rendered.
 */
export type AddNewFieldFormData = Record<string, string | boolean>;

export interface AddNewField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select';
  placeholder?: string;
  required?: boolean;
  min?: number;
  /** For `type: 'select'` */
  options?: Array<{ value: string; label: string }>;
  /** Only render this field when the predicate returns true. */
  showWhen?: (formData: AddNewFieldFormData) => boolean;
}

/**
 * Chip rendering style for multi-select values.
 * - `detailed` (default): pill with an explicit "×" remove button (used in ImageMetadataModal).
 * - `simple`: borderless click-to-remove pill, no × button (used in admin ManageClient lists).
 */
export type DropdownVariant = 'detailed' | 'simple';

interface DropdownProps<T extends MetadataItem> {
  label: string;
  multiSelect: boolean;
  options: T[];
  /** Single-select only */
  selectedValue?: T | null;
  /** Multi-select only */
  selectedValues?: T[];
  onChange: (value: T | T[] | null) => void;
  allowAddNew?: boolean;
  onAddNew?: (data: Record<string, string | number | boolean | null>) => void;
  addNewFields?: AddNewField[];
  /** Custom display text for items */
  getDisplayName?: (item: T) => string;
  /** Custom key for list items */
  getItemKey?: (item: T) => string | number;
  emptyText?: string;
  /** Show "🔴 Will be added" for items not in database */
  showNewIndicator?: boolean;
  /** Placeholder for add new inputs */
  placeholder?: string;
  /** Chip rendering style for multi-select values (default `detailed`). */
  variant?: DropdownVariant;
}

/**
 * Dropdown<T> — flexible click-to-open selector for metadata fields.
 *
 * UX: the value box itself is the click target. Clicking it toggles the
 * dropdown. The dropdown ends with a big "+" row when `allowAddNew` is set,
 * which opens the inline add-new form. Selecting an item closes the dropdown
 * — single AND multi-select — for consistency across Camera/Lens/Film/Tags/People.
 */
export default function Dropdown<T extends MetadataItem>({
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
  showNewIndicator = false,
  placeholder,
  variant = 'detailed',
}: DropdownProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelectingFromDropdown, setIsSelectingFromDropdown] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<AddNewFieldFormData>({});

  const handleCloseAll = useCallback(() => {
    setIsSelectingFromDropdown(false);
    setIsAddingNew(false);
    setFormData({});
  }, []);

  useClickOutsideMultiple(containerRef, [isSelectingFromDropdown, isAddingNew], handleCloseAll);

  /**
   * Uses custom getter if provided, otherwise falls back to displayName or name.
   * Always returns a string, never an object.
   */
  const getItemDisplayName = (item: T | null | undefined): string => {
    if (!item) return '';
    if (getDisplayName) {
      const result = getDisplayName(item);
      if (typeof result === 'string') return result;
      return '';
    }
    return item.displayName || item.name || '';
  };

  /** Uses custom getter if provided, otherwise uses id or name. */
  const getKey = (item: T): string | number => {
    if (getItemKey) return getItemKey(item);
    return item.id ?? item.name ?? '';
  };

  /** Check if an item exists in the database (has a valid id > 0). */
  const itemExistsInDatabase = (item: T | null | undefined): boolean => {
    if (!item) return true;
    return Boolean(item.id && item.id > 0);
  };

  const isItemSelected = (item: T): boolean => {
    if (multiSelect) {
      return selectedValues.some(selected => {
        if (selected.id && item.id) return selected.id === item.id;
        return getItemDisplayName(selected) === getItemDisplayName(item);
      });
    }
    if (!selectedValue) return false;
    if (selectedValue.id && item.id) return selectedValue.id === item.id;
    return getItemDisplayName(selectedValue) === getItemDisplayName(item);
  };

  const handleToggleDropdown = () => {
    setIsSelectingFromDropdown(prev => !prev);
    setIsAddingNew(false);
  };

  const handleDisplayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleDropdown();
    }
  };

  const getDisplayAriaSummary = (): string => {
    if (multiSelect) {
      return selectedValues.length > 0
        ? selectedValues.map(getItemDisplayName).join(', ')
        : emptyText;
    }
    return selectedValue ? getItemDisplayName(selectedValue) : emptyText;
  };

  const handleSelectItem = (item: T) => {
    if (multiSelect) {
      const isCurrentlySelected = isItemSelected(item);
      if (isCurrentlySelected) {
        const newSelection = selectedValues.filter(selected => {
          if (selected.id && item.id) return selected.id !== item.id;
          return getItemDisplayName(selected) !== getItemDisplayName(item);
        });
        onChange(newSelection);
      } else {
        onChange([...selectedValues, item]);
      }
    } else {
      onChange(item);
    }
    // Close on every select — single OR multi. To add another item the user
    // re-opens the dropdown. Same UX across every metadata field.
    setIsSelectingFromDropdown(false);
  };

  const handleRemoveItem = (e: React.MouseEvent | React.KeyboardEvent, item: T) => {
    e.stopPropagation();
    if (!multiSelect) return;

    const newSelection = selectedValues.filter(selected => {
      if (selected.id && item.id) return selected.id !== item.id;
      return getItemDisplayName(selected) !== getItemDisplayName(item);
    });
    onChange(newSelection);
  };

  const isFieldVisible = (field: AddNewField): boolean =>
    field.showWhen ? field.showWhen(formData) : true;

  const handleAddNew = () => {
    // Validate visible, required fields. Hidden fields (showWhen → false) are skipped.
    const missing = addNewFields.filter(isFieldVisible).filter(field => {
      if (!field.required) return false;
      const value = formData[field.name];
      if (field.type === 'checkbox') return false; // checkboxes never "missing"
      if (value === undefined || value === null) return true;
      return value.toString().trim() === '';
    });
    if (missing.length > 0) return;

    const processedData: Record<string, string | number | boolean | null> = {};
    for (const field of addNewFields) {
      // Drop fields that are hidden so the parent doesn't get stale values from
      // a sibling toggle (e.g. defaultFilmFormat when isFilm flips off).
      if (!isFieldVisible(field)) continue;
      const value = formData[field.name];
      if (field.type === 'checkbox') {
        processedData[field.name] = value === true;
      } else if (field.type === 'number') {
        processedData[field.name] =
          typeof value === 'string' && value !== '' ? Number.parseInt(value, 10) : null;
      } else if (typeof value === 'string') {
        processedData[field.name] = value.trim() || null;
      } else {
        processedData[field.name] = value ? String(value) : null;
      }
    }

    if (onAddNew) {
      onAddNew(processedData);
    }

    setFormData({});
    setIsAddingNew(false);
  };

  const isAddNewFormValid = (): boolean => {
    return addNewFields
      .filter(isFieldVisible)
      .filter(field => field.required)
      .every(field => {
        const value = formData[field.name];
        if (field.type === 'checkbox') return true;
        if (value === undefined || value === null) return false;
        if (field.type === 'number') {
          const numValue = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
          return !Number.isNaN(numValue) && numValue > 0;
        }
        return value.toString().trim().length > 0;
      });
  };

  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

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

  return (
    <div className={styles.formGroup} ref={containerRef}>
      <div className={styles.formLabelRow}>
        <label className={styles.formLabel}>{label}</label>
      </div>

      {/* Current Selection Display — itself the dropdown trigger */}
      <div
        className={styles.cameraDisplay}
        role="button"
        tabIndex={0}
        aria-expanded={isSelectingFromDropdown}
        aria-label={`${label}: ${getDisplayAriaSummary()}. Click to change.`}
        onClick={handleToggleDropdown}
        onKeyDown={handleDisplayKeyDown}
      >
        <div className={styles.cameraValue}>
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

          {multiSelect &&
            (selectedValues.length === 0 ? (
              <span className={styles.cameraEmpty}>{emptyText}</span>
            ) : (
              <div className={styles.selectedChips}>
                {selectedValues.map(item =>
                  variant === 'simple' ? (
                    <div
                      key={getKey(item)}
                      className={styles.chipSimple}
                      onClick={e => handleRemoveItem(e, item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRemoveItem(e, item);
                      }}
                      aria-label={`Remove ${getItemDisplayName(item)}`}
                    >
                      {getItemDisplayName(item)}
                    </div>
                  ) : (
                    <div key={getKey(item)} className={styles.chip}>
                      <span>{getItemDisplayName(item)}</span>
                      <button
                        type="button"
                        onClick={e => handleRemoveItem(e, item)}
                        className={styles.chipRemove}
                        aria-label={`Remove ${getItemDisplayName(item)}`}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            ))}
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
              {allowAddNew && ' Click the + below to create one.'}
            </div>
          )}
          {allowAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setIsSelectingFromDropdown(false);
              }}
              className={styles.cameraDropdownAddPlus}
              aria-label={`Add new ${label.toLowerCase()}`}
            >
              <Plus size={24} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Add New Form */}
      {isAddingNew && (
        <div className={styles.addNewInput}>
          {addNewFields.map((field, index) => {
            if (!isFieldVisible(field)) return null;
            const rawValue = formData[field.name];

            if (field.type === 'checkbox') {
              const checked = rawValue === true;
              return (
                <div key={field.name} className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => handleFieldChange(field.name, e.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                </div>
              );
            }

            if (field.type === 'select') {
              const selectValue = typeof rawValue === 'string' ? rawValue : '';
              return (
                <div key={field.name} className={styles.formGroup}>
                  <label htmlFor={field.name} className={styles.formLabel}>
                    {field.label}
                  </label>
                  <select
                    id={field.name}
                    value={selectValue}
                    onChange={e => handleFieldChange(field.name, e.target.value)}
                    className={styles.formSelect}
                    autoFocus={index === 0}
                  >
                    <option value="">
                      {field.placeholder ?? `Select ${field.label.toLowerCase()}`}
                    </option>
                    {(field.options ?? []).map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            const inputValue = typeof rawValue === 'string' ? rawValue : '';
            return (
              <div key={field.name} className={styles.formGroup}>
                <label htmlFor={field.name} className={styles.formLabel}>
                  {field.label}
                </label>
                <input
                  id={field.name}
                  type={field.type}
                  value={inputValue}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  onKeyDown={handleFieldKeyDown}
                  placeholder={
                    field.placeholder || placeholder || `Enter ${field.label.toLowerCase()}`
                  }
                  className={styles.formInput}
                  min={field.type === 'number' ? field.min : undefined}
                  autoFocus={index === 0}
                />
              </div>
            );
          })}

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
