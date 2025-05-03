import React from 'react';

import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import styles from '@/styles/Catalog.module.scss';
import { handleFileSelect, uploadSelectedFiles } from '@/utils/catalogUtils';

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
    selectedForSwap,
    setSelectedForSwap,
    isImageReorderMode,
    setIsImageReorderMode,
  } = useEditContext();

  const handleFieldChange = (field: string) => async (e: any) => {
    let value: number | boolean;

    if (field === 'selectImage' && e.target.files) {
      if (isEditMode) {
        try {

          const uploadedImages = await uploadSelectedFiles(e.target.files, editCatalog.title);
          if (uploadedImages && uploadedImages.length > 0) {

            setEditCatalog({
              ...editCatalog,
              images: uploadedImages,
            });
          }
        } catch (error) {
          console.error('Error uploading images:', error);
        }
      } else {
        handleFileSelect(setSelectedFiles, setPreviewData, e.target.files);
      }
      return;
    } else if (field === 'isHomeCard') {
      value = !editCatalog.isHomeCard;
    } else if (field === 'priority') {
      value = Number.parseInt(e.target.value, 10);
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
    if (field === 'imageReorder') {
      // Toggle image reorder mode
      setIsImageReorderMode(!isImageReorderMode);
      
      // Clear the selected image for swap when toggling off
      if (isImageReorderMode && selectedForSwap) {
        setSelectedForSwap(null);
      }
    }
  };

  // Display data source depends on mode
  const catalog = (isEditMode || isCreateMode)
    ? editCatalog
    : currentCatalog;

  if (!catalog && !isCreateMode) {
    return <div>Loading catalog data...</div>;
  }

  // Date placeholder value
  const datePlaceholder = new Date().toISOString().split('T')[0];

  return (
    <div className={styles.metadataWrapper}>
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

        {/* Title field */}
        <div className={`${styles.fieldContainer} ${styles['full-width']}`}>
          {(isEditMode || isCreateMode) ? (
            <input
              type="text"
              value={catalog?.title || ''}
              onChange={handleFieldChange('title')}
              placeholder="Enter title"
              className={styles.catalogTitleEdit}
            />
          ) : (
            <div className={styles.catalogTitle}>
              {catalog?.title || 'Enter title'}
            </div>
          )}
        </div>

        {/* Date field */}
        <div className={`${styles.fieldContainer} ${styles['half-width']}`}>
          {(isEditMode || isCreateMode) ? (
            <div>
              <input
                type="date"
                value={catalog?.date || datePlaceholder}
                onChange={handleFieldChange('date')}
                className={styles.catalogDateEdit || ''}
              />
            </div>
          ) : (
            <div className={styles.catalogDate}>
              {catalog?.date || datePlaceholder}
            </div>
          )}
        </div>
        
        {/* Location field */}
        <div className={`${styles.fieldContainer} ${styles['full-width']}`}>
          {(isEditMode || isCreateMode) ? (
            <input
              type="text"
              value={catalog?.location || ''}
              onChange={handleFieldChange('location')}
              placeholder="Enter location"
              className={styles.catalogLocationEdit}
            />
          ) : (
            <div className={styles.catalogLocation}>
              {catalog?.location || 'Enter location'}
            </div>
          )}
        </div>
        
        {/* Description field  */}
        <div className={`${styles.fieldContainer} ${styles['full-width']}`}>
          {(isEditMode || isCreateMode) ? (
            <textarea
              value={catalog?.description || ''}
              onChange={handleFieldChange('description')}
              placeholder="Enter description"
              className={styles.catalogDescriptionEdit}
              rows={3}
            />
          ) : (
            <div className={styles.catalogDescription}>
              {catalog?.description || 'Enter description'}
            </div>
          )}
        </div>
        
        {/* CoverImageUrl button */}
        {(isEditMode || isCreateMode) && (
          <div className={`${styles.fieldContainer} ${styles['half-width']}`}>
            <button 
              className={styles.catalogCoverImageUrlEdit}
              onClick={() => handleButtonClick('coverImageUrl')}
            >
              Select Cover Image
            </button>
          </div>
        )}
        
        {/* SelectImages button */}
        {(isEditMode || isCreateMode) && (
          <div className={`${styles.fieldContainer} ${styles['half-width']}`}>
            <button 
              className={styles.catalogSelectImagesEdit}
              onClick={() => handleButtonClick('selectImages')}
            >
              Select Images
            </button>
          </div>
        )}
        
        {/* Image Reorder button */}
        {(isEditMode || isCreateMode) && (
          <div className={`${styles.fieldContainer} ${styles['half-width']}`}>
            <button 
              className={`${styles.catalogSelectImagesEdit} ${isImageReorderMode ? styles.active : ''}`}
              onClick={() => handleButtonClick('imageReorder')}
            >
              Image Reorder
            </button>
          </div>
        )}
        
        {/* Priority select */}
        {(isEditMode || isCreateMode) && (
          <div className={`${styles.fieldContainer} ${styles['quarter-width']}`}>
            <select
              value={catalog?.priority || 3}
              onChange={handleFieldChange('priority')}
              className={styles.catalogPriorityEdit}
            >
              <option value={1}>High (1)</option>
              <option value={2}>Medium (2)</option>
              <option value={3}>Low (3)</option>
            </select>
          </div>
        )}
        
        {/* IsHomeCard toggle */}
        {(isEditMode || isCreateMode) && (
          <div className={`${styles.fieldContainer} ${styles['quarter-width']}`}>
            <div className={styles.catalogHomeItemEdit}>
              <input
                type="checkbox"
                checked={catalog?.isHomeCard || false}
                onChange={handleFieldChange('isHomeCard')}
              />
              <label className="toggleLabel">
                Home Item
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogMetadata;