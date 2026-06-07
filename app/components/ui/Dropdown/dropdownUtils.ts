/**
 * Pure helpers for {@link Dropdown} — item display/key resolution, selection matching, and the
 * "add new" form's visibility/validation/processing logic. Kept out of the component so the JSX
 * stays thin and each derivation is individually unit-testable.
 *
 * All item helpers are generic over `T extends MetadataItem`; callers thread their optional
 * `getDisplayName` / `getItemKey` getters in as arguments rather than closing over component props.
 */

import { type AddNewField, type AddNewFieldFormData, type MetadataItem } from './Dropdown';

/**
 * Resolve an item's display text. Uses the custom `getDisplayName` getter when provided, otherwise
 * falls back to `displayName` or `name`. Always returns a string, never an object — a non-string
 * getter result is defensively coerced to `''`.
 */
export function getItemDisplayName<T extends MetadataItem>(
  item: T | null | undefined,
  getDisplayName?: (item: T) => string
): string {
  if (!item) return '';
  if (getDisplayName) {
    const result = getDisplayName(item);
    if (typeof result === 'string') return result;
    return '';
  }
  return item.displayName || item.name || '';
}

/** Resolve an item's list key. Uses the custom `getItemKey` getter if provided, otherwise id or name. */
export function getKey<T extends MetadataItem>(
  item: T,
  getItemKey?: (item: T) => string | number
): string | number {
  if (getItemKey) return getItemKey(item);
  return item.id ?? item.name ?? '';
}

/** Check if an item exists in the database (has a valid id > 0). A null/undefined item is treated as existing. */
export function itemExistsInDatabase<T extends MetadataItem>(item: T | null | undefined): boolean {
  if (!item) return true;
  return Boolean(item.id && item.id > 0);
}

/**
 * Whether `item` is currently selected. Matches by id when both sides have one, otherwise by
 * resolved display name. In single-select mode `selectedValues` is ignored (and vice versa).
 */
export function isItemSelected<T extends MetadataItem>(
  item: T,
  selectedValue: T | null | undefined,
  selectedValues: T[],
  multiSelect: boolean,
  getDisplayName?: (item: T) => string
): boolean {
  if (multiSelect) {
    return selectedValues.some(selected => {
      if (selected.id && item.id) return selected.id === item.id;
      return (
        getItemDisplayName(selected, getDisplayName) === getItemDisplayName(item, getDisplayName)
      );
    });
  }
  if (!selectedValue) return false;
  if (selectedValue.id && item.id) return selectedValue.id === item.id;
  return (
    getItemDisplayName(selectedValue, getDisplayName) === getItemDisplayName(item, getDisplayName)
  );
}

/**
 * Remove `item` from `selectedValues`. Matches by id when both sides have one, otherwise by resolved
 * display name. Shared by the chip-remove and multi-select-toggle paths.
 */
export function removeFromSelection<T extends MetadataItem>(
  selectedValues: T[],
  item: T,
  getDisplayName?: (item: T) => string
): T[] {
  return selectedValues.filter(selected => {
    if (selected.id && item.id) return selected.id !== item.id;
    return (
      getItemDisplayName(selected, getDisplayName) !== getItemDisplayName(item, getDisplayName)
    );
  });
}

/**
 * Toggle `item` in a multi-select array: remove it if already selected, otherwise append it.
 */
export function toggleMultiSelection<T extends MetadataItem>(
  selectedValues: T[],
  item: T,
  getDisplayName?: (item: T) => string
): T[] {
  if (isItemSelected(item, null, selectedValues, true, getDisplayName)) {
    return removeFromSelection(selectedValues, item, getDisplayName);
  }
  return [...selectedValues, item];
}

/** Whether an add-new field should render: true unless its `showWhen` predicate returns false. */
export function isFieldVisible(field: AddNewField, formData: AddNewFieldFormData): boolean {
  return field.showWhen ? field.showWhen(formData) : true;
}

/**
 * The visible, required fields that are still empty. Hidden fields (`showWhen` → false) are skipped,
 * and checkboxes are never considered missing.
 */
export function findMissingRequiredFields(
  fields: AddNewField[],
  formData: AddNewFieldFormData
): AddNewField[] {
  return fields
    .filter(field => isFieldVisible(field, formData))
    .filter(field => {
      if (!field.required) return false;
      const value = formData[field.name];
      if (field.type === 'checkbox') return false; // checkboxes never "missing"
      if (value === undefined || value === null) return true;
      return value.toString().trim() === '';
    });
}

/**
 * Coerce the raw form data into the typed payload `onAddNew` expects. Hidden fields are dropped so
 * the parent doesn't get stale values from a sibling toggle (e.g. defaultFilmFormat when isFilm
 * flips off). Checkboxes → boolean, numbers → parsed int or null, strings → trimmed or null.
 */
export function processAddNewFormData(
  fields: AddNewField[],
  formData: AddNewFieldFormData
): Record<string, string | number | boolean | null> {
  const processedData: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    // Drop fields that are hidden so the parent doesn't get stale values from
    // a sibling toggle (e.g. defaultFilmFormat when isFilm flips off).
    if (!isFieldVisible(field, formData)) continue;
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
  return processedData;
}

/**
 * Whether every visible, required field holds a valid value. Checkboxes are always valid; numbers
 * must parse to a positive (> 0) value; other fields must have non-whitespace content.
 */
export function isAddNewFormValid(fields: AddNewField[], formData: AddNewFieldFormData): boolean {
  return fields
    .filter(field => isFieldVisible(field, formData))
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
}
