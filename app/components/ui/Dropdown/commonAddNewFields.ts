import { type AddNewField } from '@/app/components/ui/Dropdown/Dropdown';

/**
 * Shared "add new" field configs for the Location and Person dropdowns.
 * These literals were previously duplicated verbatim across the metadata
 * editor sections (EssentialInfoSection / TagsPeopleSection) and the admin
 * manage page — extracted here to kill the drift risk.
 */
export const LOCATION_ADD_NEW_FIELDS: AddNewField[] = [
  { name: 'name', label: 'Location Name', type: 'text', placeholder: 'e.g., Seattle, WA', required: true },
];

export const PERSON_ADD_NEW_FIELDS: AddNewField[] = [
  { name: 'name', label: 'Person Name', type: 'text', placeholder: 'Enter person name', required: true },
];
