import React, { useEffect } from 'react';

import EditableField from '@/Components/EditableField/EditableField';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import styles from '@/styles/Catalog.module.scss';
import { fieldConfigs } from '@/utils/catalogUtils';

interface CatalogMetadataProps {
  contentWidth: number;
}

const CatalogMetadata: React.FC<CatalogMetadataProps> = () => {
  const { currentCatalog } = useAppContext();
  const {
    isEditMode,
    isCreateMode,
    editCatalog,
    setEditCatalog,
    isEditCoverImage,
    setIsEditCoverImage,
  } = useEditContext();

  useEffect(() => {
    console.log(`[zac] - editCatalog: ${JSON.stringify(editCatalog)}`);
  }, [editCatalog]);

  const handleFieldChange = (field: string) => (e: any) => {
    let value = e.target.value;
    if (field === 'priority') {
      value = Number.parseInt(value, 10);
    }
    setEditCatalog({
      ...editCatalog,
      [field]: value,
    });
  };

  const handleButtonClick = (field: string) => {
    if (field === 'coverImageUrl') {
      console.log('coverImageUrl being selected');
      setIsEditCoverImage(!isEditCoverImage);

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
    <div className={styles.catalogHeader}>
      <div className={styles.catalogHeaderLeft}>
        {Object.entries(fieldConfigs).map(([field, config]) => (
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
          />
        ))}
      </div>
    </div>
  );
};

export default CatalogMetadata;