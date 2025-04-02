import React from 'react';

import styles from '../../styles/Catalog.module.scss';

// Editable component that handles both display and edit states
const EditableField = ({
  value,
  editValue,
  isEditMode,
  isEditing,
  setIsEditing,
  onChange,
  fieldType = 'text',
  className,
  editClassName,
}) => {
  // Show input when editing
  if (isEditMode && isEditing) {
    return (
      <input
        type={fieldType}
        value={editValue || ''}
        onChange={onChange}
        className={`${className} ${editClassName}`}
      />
    );
  }

  // Show text with edit styling when in edit mode
  return (
    <div
      className={`${className} ${isEditMode ? editClassName : ''}`}
      onClick={() => isEditMode && setIsEditing(true)}
    >
      {value}
    </div>
  );
};

// Title component
export const EditableTitle = ({
  title,
  editTitle,
  isEditMode,
  isTitleEdit,
  setIsTitleEdit,
  handleTitleChange,
}) => (
  <EditableField
    value={title}
    editValue={editTitle}
    isEditMode={isEditMode}
    isEditing={isTitleEdit}
    setIsEditing={setIsTitleEdit}
    onChange={handleTitleChange}
    className={styles.catalogTitle}
    editClassName={styles.catalogTitleEdit}
  />
);

// Paragraph component
export const EditableParagraph = ({
  paragraph,
  editParagraph,
  isEditMode,
  isParagraphEdit,
  setIsParagraphEdit,
  handleParagraphChange,
}) => (
  <EditableField
    value={paragraph}
    editValue={editParagraph}
    isEditMode={isEditMode}
    isEditing={isParagraphEdit}
    setIsEditing={setIsParagraphEdit}
    onChange={handleParagraphChange}
    className={styles.catalogDescription}
    editClassName={styles.descriptionEdit}
  />
);