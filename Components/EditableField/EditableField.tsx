import React from 'react';

import { FieldType } from '@/utils/catalogUtils';

interface EditableFieldProps {
  value: string | number;
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
}) => {

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
        <button onClick={onClick}>Select Cover Image</button>
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
