/**
 * Unit tests for the pure helpers extracted from {@link Dropdown}.
 */

import { type AddNewField, type MetadataItem } from '@/app/components/ui/Dropdown/Dropdown';
import {
  findMissingRequiredFields,
  getItemDisplayName,
  getKey,
  isAddNewFormValid,
  isFieldVisible,
  isItemSelected,
  itemExistsInDatabase,
  processAddNewFormData,
  removeFromSelection,
  toggleMultiSelection,
} from '@/app/components/ui/Dropdown/dropdownUtils';

interface TagItem extends MetadataItem {
  id: number;
  name: string;
}

const tag = (id: number, name: string): TagItem => ({ id, name });

describe('getItemDisplayName', () => {
  it('returns empty string for null/undefined', () => {
    const noItem: TagItem | undefined = undefined;
    expect(getItemDisplayName(null)).toBe('');
    expect(getItemDisplayName(noItem)).toBe('');
  });

  it('falls back to displayName then name when no getter is provided', () => {
    expect(getItemDisplayName({ displayName: 'Disp', name: 'Nm' })).toBe('Disp');
    expect(getItemDisplayName({ name: 'Nm' })).toBe('Nm');
    expect(getItemDisplayName({})).toBe('');
  });

  it('uses the custom getter when provided', () => {
    expect(getItemDisplayName(tag(1, 'Mountains'), item => `#${item.name}`)).toBe('#Mountains');
  });

  it('defensively coerces a non-string getter result to empty string', () => {
    // Simulate a misbehaving getter returning a non-string at runtime.
    const badGetter = (() => ({ not: 'a string' })) as unknown as (item: TagItem) => string;
    expect(getItemDisplayName(tag(1, 'Mountains'), badGetter)).toBe('');
  });
});

describe('getKey', () => {
  it('uses the custom getItemKey getter when provided', () => {
    expect(getKey(tag(5, 'Ocean'), item => `key-${item.id}`)).toBe('key-5');
  });

  it('falls back to id, then name, then empty string', () => {
    expect(getKey(tag(5, 'Ocean'))).toBe(5);
    expect(getKey({ name: 'Ocean' })).toBe('Ocean');
    expect(getKey({})).toBe('');
  });
});

describe('itemExistsInDatabase', () => {
  it('treats a null/undefined item as existing', () => {
    const noItem: TagItem | undefined = undefined;
    expect(itemExistsInDatabase(null)).toBe(true);
    expect(itemExistsInDatabase(noItem)).toBe(true);
  });

  it('is true only for a positive id', () => {
    expect(itemExistsInDatabase(tag(1, 'A'))).toBe(true);
    expect(itemExistsInDatabase(tag(0, 'New'))).toBe(false);
    expect(itemExistsInDatabase({ name: 'No id' })).toBe(false);
    expect(itemExistsInDatabase({ id: -1, name: 'Neg' })).toBe(false);
  });
});

describe('isItemSelected', () => {
  const a = tag(1, 'Mountains');
  const b = tag(2, 'Ocean');

  it('matches by id in multi-select', () => {
    expect(isItemSelected(a, null, [a, b], true)).toBe(true);
    expect(isItemSelected(tag(3, 'Forest'), null, [a, b], true)).toBe(false);
  });

  it('falls back to display-name match when ids are absent', () => {
    const x = { name: 'Mountains' };
    const y = { name: 'Mountains' };
    expect(isItemSelected(y, null, [x], true)).toBe(true);
  });

  it('matches the single selectedValue in single-select', () => {
    expect(isItemSelected(a, a, [], false)).toBe(true);
    expect(isItemSelected(b, a, [], false)).toBe(false);
  });

  it('returns false in single-select when nothing is selected', () => {
    expect(isItemSelected(a, null, [], false)).toBe(false);
  });

  it('honors the custom getDisplayName when matching by name', () => {
    const x = { name: 'mountains' };
    const y = { name: 'MOUNTAINS' };
    const lower = (item: MetadataItem) => (item.name ?? '').toLowerCase();
    expect(isItemSelected(y, null, [x], true, lower)).toBe(true);
  });
});

describe('removeFromSelection', () => {
  const a = tag(1, 'Mountains');
  const b = tag(2, 'Ocean');

  it('removes the matching item by id', () => {
    expect(removeFromSelection([a, b], a)).toEqual([b]);
  });

  it('removes by display name when ids are absent', () => {
    const x = { name: 'Mountains' };
    const y = { name: 'Ocean' };
    expect(removeFromSelection([x, y], { name: 'Mountains' })).toEqual([y]);
  });

  it('returns the array unchanged when the item is not present', () => {
    expect(removeFromSelection([a], b)).toEqual([a]);
  });
});

describe('toggleMultiSelection', () => {
  const a = tag(1, 'Mountains');
  const b = tag(2, 'Ocean');

  it('appends an unselected item', () => {
    expect(toggleMultiSelection([a], b)).toEqual([a, b]);
  });

  it('removes an already-selected item', () => {
    expect(toggleMultiSelection([a, b], a)).toEqual([b]);
  });

  it('appends to an empty selection', () => {
    expect(toggleMultiSelection([], a)).toEqual([a]);
  });
});

describe('isFieldVisible', () => {
  it('is visible by default when no showWhen predicate is set', () => {
    const field: AddNewField = { name: 'name', label: 'Name', type: 'text' };
    expect(isFieldVisible(field, {})).toBe(true);
  });

  it('defers to the showWhen predicate against the form data', () => {
    const field: AddNewField = {
      name: 'defaultFilmFormat',
      label: 'Format',
      type: 'text',
      showWhen: data => data.isFilm === true,
    };
    expect(isFieldVisible(field, { isFilm: true })).toBe(true);
    expect(isFieldVisible(field, { isFilm: false })).toBe(false);
    expect(isFieldVisible(field, {})).toBe(false);
  });
});

describe('findMissingRequiredFields', () => {
  const nameField: AddNewField = { name: 'name', label: 'Name', type: 'text', required: true };
  const optionalField: AddNewField = { name: 'note', label: 'Note', type: 'text' };

  it('returns required fields with empty/missing values', () => {
    expect(findMissingRequiredFields([nameField], {}).map(f => f.name)).toEqual(['name']);
    expect(findMissingRequiredFields([nameField], { name: '   ' }).map(f => f.name)).toEqual([
      'name',
    ]);
  });

  it('ignores filled required fields and all optional fields', () => {
    expect(findMissingRequiredFields([nameField, optionalField], { name: 'Sunsets' })).toEqual([]);
  });

  it('never reports checkboxes as missing', () => {
    const cb: AddNewField = { name: 'isFilm', label: 'Film', type: 'checkbox', required: true };
    expect(findMissingRequiredFields([cb], {})).toEqual([]);
  });

  it('skips hidden (showWhen → false) required fields', () => {
    const hidden: AddNewField = {
      name: 'fmt',
      label: 'Format',
      type: 'text',
      required: true,
      showWhen: data => data.isFilm === true,
    };
    expect(findMissingRequiredFields([hidden], { isFilm: false })).toEqual([]);
  });
});

describe('processAddNewFormData', () => {
  it('coerces a checkbox to a boolean', () => {
    const field: AddNewField = { name: 'isFilm', label: 'Film', type: 'checkbox' };
    expect(processAddNewFormData([field], { isFilm: true })).toEqual({ isFilm: true });
    expect(processAddNewFormData([field], {})).toEqual({ isFilm: false });
  });

  it('parses a number field, or null when empty', () => {
    const field: AddNewField = { name: 'iso', label: 'ISO', type: 'number' };
    expect(processAddNewFormData([field], { iso: '400' })).toEqual({ iso: 400 });
    expect(processAddNewFormData([field], { iso: '' })).toEqual({ iso: null });
    expect(processAddNewFormData([field], {})).toEqual({ iso: null });
  });

  it('trims a string field, or null when blank', () => {
    const field: AddNewField = { name: 'name', label: 'Name', type: 'text' };
    expect(processAddNewFormData([field], { name: '  Sunsets  ' })).toEqual({ name: 'Sunsets' });
    expect(processAddNewFormData([field], { name: '   ' })).toEqual({ name: null });
  });

  it('drops hidden fields entirely from the payload', () => {
    const visible: AddNewField = { name: 'name', label: 'Name', type: 'text' };
    const hidden: AddNewField = {
      name: 'fmt',
      label: 'Format',
      type: 'text',
      showWhen: data => data.isFilm === true,
    };
    const result = processAddNewFormData([visible, hidden], {
      name: 'X',
      fmt: '35mm',
      isFilm: false,
    });
    expect(result).toEqual({ name: 'X' });
    expect(result).not.toHaveProperty('fmt');
  });
});

describe('isAddNewFormValid', () => {
  const nameField: AddNewField = { name: 'name', label: 'Name', type: 'text', required: true };

  it('is valid when every visible required field has content', () => {
    expect(isAddNewFormValid([nameField], { name: 'Sunsets' })).toBe(true);
  });

  it('is invalid when a required field is empty/whitespace/missing', () => {
    expect(isAddNewFormValid([nameField], {})).toBe(false);
    expect(isAddNewFormValid([nameField], { name: '   ' })).toBe(false);
  });

  it('treats checkboxes as always valid', () => {
    const cb: AddNewField = { name: 'isFilm', label: 'Film', type: 'checkbox', required: true };
    expect(isAddNewFormValid([cb], {})).toBe(true);
  });

  it('requires a positive parseable number for required number fields', () => {
    const num: AddNewField = { name: 'iso', label: 'ISO', type: 'number', required: true };
    expect(isAddNewFormValid([num], { iso: '400' })).toBe(true);
    expect(isAddNewFormValid([num], { iso: '0' })).toBe(false);
    expect(isAddNewFormValid([num], { iso: 'abc' })).toBe(false);
    expect(isAddNewFormValid([num], { iso: '' })).toBe(false);
  });

  it('ignores hidden required fields', () => {
    const hidden: AddNewField = {
      name: 'fmt',
      label: 'Format',
      type: 'text',
      required: true,
      showWhen: data => data.isFilm === true,
    };
    expect(isAddNewFormValid([hidden], { isFilm: false })).toBe(true);
  });
});
