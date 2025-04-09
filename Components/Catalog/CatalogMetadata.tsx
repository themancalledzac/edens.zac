import React from 'react';

import EditableField from '@/Components/EditableField/EditableField';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import styles from '@/styles/Catalog.module.scss';
import { fieldConfigs } from '@/utils/catalogFieldConfigs';
import { handleFileSelect } from '@/utils/catalogUtils';

type CatalogMetadataProps = object;

const CatalogMetadata: React.FC<CatalogMetadataProps> = () => {
  const { currentCatalog } = useAppContext();
  const {
    isEditMode,
    isCreateMode,
    editCatalog,
    setEditCatalog,
    isEditCoverImage,
    setIsEditCoverImage,
    setSelectedFiles,
    setPreviewData,
  } = useEditContext();

  const handleFieldChange = (field: string) => (e: any) => {
    let value: number | boolean;

    if (field === 'selectImage' && e.target.files) {
      handleFileSelect(setSelectedFiles, setPreviewData, e.target.files);
      return;
    } else if (field === 'isHomeCard') {
      value = !editCatalog.isHomeCard;
    } else if (field === 'priority') {
      value = Number.parseInt(e.target.value, 10);
      console.log(`[zac] - priority number: ${e.target.value}`);
    } else {
      // Regular field change
      value = e.target.value;

    }

    setEditCatalog({
      ...editCatalog,
      [field]: value,
    });
  };

  const handleButtonClick = (field: string) => {
    if (field === 'coverImageUrl') {
      setIsEditCoverImage(!isEditCoverImage);
    }
    if (field === 'selectImages') {
      document.getElementById('file-upload')?.click();
    }
  };

  // Display data source depends on mode
  const catalog = (isEditMode || isCreateMode)
    ? editCatalog
    : currentCatalog;

  if (!catalog && !isCreateMode) {
    return <div>Loading catalog data...</div>;
  }

  return (
    <div
      className={styles.metadataWrapper}>
      <div className={styles.metadata}>
        <input
          type="file"
          multiple
          style={{ display: 'none' }}
          accept="image/jpeg,image/jpg,image/webp"
          onChange={handleFieldChange('selectImage')}
          className={styles.input}
          id="file-upload"
        />
        {Object.entries(fieldConfigs).map(([field, config]) => (
          <div
            key={field}
            className={`${styles.fieldContainer} ${styles[`${config.width}-width`]}`}
          >
            <EditableField
              key={field}
              value={catalog?.[field] || ''}
              placeholder={config.placeholder}
              onChange={handleFieldChange(field)}
              isEditMode={isEditMode}
              isCreateMode={isCreateMode}
              fieldType={config.fieldType}
              options={config?.options}
              viewClassName={config.viewClassName}
              editClassName={config.editClassName}
              editable={config.editable}
              onClick={() => handleButtonClick(field)}
              main={config.main} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CatalogMetadata;