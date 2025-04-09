import React from 'react';

import { FieldType } from '@/utils/catalogFieldConfigs';

interface EditableFieldProps {
  value: string | number | boolean;
  placeholder: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement>,
  ) => void;
  isEditMode: boolean;
  isCreateMode: boolean;
  fieldType?: FieldType;
  options?: Array<{ value: string | number, label: string }>;
  viewClassName?: string;
  editClassName?: string;
  editable: boolean;
  onClick: () => void;
  main: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  placeholder,
  onChange,
  isEditMode,
  isCreateMode,
  fieldType = 'input',
  options = [],
  viewClassName,
  editClassName,
  editable,
  onClick,
  main,
}) => {

  if (!main && (!isEditMode && !isCreateMode)) {
    return null;
  }

  if ((!isEditMode && !isCreateMode) || !editable) {
    return (
      <div className={viewClassName}>
        {value || placeholder}
      </div>
    );
  }


  // In edit mode, show the editing interface directly
  switch (fieldType) {
    case 'textarea':
      return (
        <textarea
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          className={editClassName}
          rows={3}
        />
      );
    case 'select':
      return (
        <select
          value={value as string | number}
          onChange={onChange}
          className={editClassName}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case 'button':
      return (
        <button
          className={editClassName}
          onClick={value === 'selectImages'
            ? () => document.getElementById('file-upload')?.click()
            : onClick}
        >
          {placeholder}
        </button>
      );
    case 'toggle':
      return (
        <div className={editClassName}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={onChange}
          />
          <label className="toggleLabel">
            {placeholder}
          </label>
        </div>
      );
    default:
      return (
        <input
          type="text"
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          className={editClassName}
        />
      );
  }
};


export default EditableField;
