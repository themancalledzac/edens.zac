import React, { useEffect, useMemo, useState } from 'react';

import CatalogMetadata from '@/Components/Catalog/CatalogMetadata';
import ImageUploadList from '@/Components/Catalog/ImageUploadList';
import { UpdateToolbar } from '@/Components/EditToolbar/UpdateToolbar';
import ImageFullScreen from '@/Components/ImageFullScreen/ImageFullScreen';
import PhotoBlockComponent from '@/Components/PhotoBlockComponent/PhotoBlockComponent';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import { createCatalog, fetchCatalogBySlug, updateCatalog } from '@/lib/api/catalogs';
import { Catalog } from '@/types/Catalog';
import { Image } from '@/types/Image';
import { CatalogPageProps, createEmptyCatalog } from '@/utils/catalogUtils';
import { chunkImages } from '@/utils/imageUtils';

import Header from '../../Components/Header/Header';
import styles from '../../styles/Catalog.module.scss';

/**
 * Photography Gallery Page.
 */
export async function getServerSideProps({ params }) {
  const { slug } = params;

  if (slug === 'create') {
    return {
      props: {
        create: true,
        catalog: createEmptyCatalog(),
      },
    };
  }

  try {
    const catalog: Catalog = await fetchCatalogBySlug(slug);
    return {
      props: {
        create: false,
        catalog,
      },
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      notFound: true,
    };
  }
}

/**
 * The page component that renders the content for each title
 *
 * TODO: Add more space above Title, feels too crowded
 *  - Verify 2 wide and pans also are still working
 *  - blog single isn't full width fyi
 *  - "Tab Enter" to accept, or, the ACCEPT button on the bottom right, next to CANCEL
 *
 * @param create
 * @param catalog Catalog data.
 // * @param initialImageChunks Images from the database, in order.
 * @constructor
 */
const CatalogPage: React.FC<CatalogPageProps> = ({ create, catalog }: CatalogPageProps) => {
    const { isMobile, currentCatalog, setCurrentCatalog } = useAppContext();
    const {
      isEditMode,
      setIsEditMode,
      setIsCreateMode,
      isCreateMode,
      imageSelected,
      setImageSelected,
      editCatalog,
      setEditCatalog,
      handleCancelChanges,
      selectedFiles,
      setSelectedFiles,
      previewData,
      setPreviewData,
    } = useEditContext();

    const [contentWidth, setContentWidth] = useState(800);

    const imageChunks = useMemo(() => {
      // When editing, use editCatalog's images
      const sourceImages = isEditMode && editCatalog
        ? editCatalog?.images
        : currentCatalog?.images;
      return chunkImages(sourceImages, 3);
    }, [currentCatalog, editCatalog, isEditMode, catalog]);

    useEffect(() => {
      if (create) {
        setIsCreateMode(true);
      } else if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
        // Only update if the catalog changed or is not yet set
        setCurrentCatalog(catalog);
      }
    }, [catalog, create, currentCatalog]);

    /**
     * Hook to handle Catalog in Update/Edit mode.
     */
    useEffect(() => {
      if (isEditMode) {
        setEditCatalog({
          ...currentCatalog,
        });
      }
    }, [isEditMode, currentCatalog, setEditCatalog]);

    /**
     * Hook that updates current catalog on update.
     *
     * TODO: Not sure if this is needed or this automatically happens.
     */
    useEffect(() => {
      if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
        setCurrentCatalog(catalog);
      }
    }, [catalog, currentCatalog]);

const handleSave = async () => {
  try {
    if (isCreateMode) {
      // Leave create mode logic as is
      const result = await createCatalog(editCatalog, selectedFiles);
      window.location.href = `/catalog/${result.slug}`;
    } else {
      if (!editCatalog || !currentCatalog) return;

      // Create a copy of editCatalog
      const optimizedCatalog = { ...editCatalog };
      
      // Use type assertion to tell TypeScript "trust me, this is valid"
      optimizedCatalog.images = editCatalog.images?.map(img => ({ 
        id: img.id 
      })) as Image[];
      
      const result = await updateCatalog(optimizedCatalog);
      setCurrentCatalog(result);
      setIsEditMode(false);
      setEditCatalog(null);
    }
  } catch (error) {
    console.error('Failed to save changes:', error);
  }
};

    /**
     * ImageFullScreen Hook to handle arrow click.
     */
    useEffect(() => {
      const handleKeyDown = (event) => {
        if (imageSelected === null) return;

        const flattenedData = imageChunks.flat();
        const currentIndex = flattenedData.findIndex(img => img.id === imageSelected.id);

        if (event.key === 'ArrowRight') {
          const nextIndex = (currentIndex + 1) % flattenedData.length;
          setImageSelected(flattenedData[nextIndex]);
        } else if (event.key === 'ArrowLeft') {
          const prevIndex = (currentIndex - 1 + flattenedData.length) % flattenedData.length;
          setImageSelected(flattenedData[prevIndex]);
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };


    }, [imageChunks, imageSelected, setImageSelected]);

    /**
     * Hook to calculate component width if Mobile view changes.
     */
    useEffect(() => {
      const calculateComponentWidth = () => {
        return isMobile ? window.innerWidth - 40 : Math.min(window.innerWidth * 0.8, 1200);
      };

      setContentWidth(calculateComponentWidth());

      const handleResize = () => {
        setContentWidth(calculateComponentWidth());
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [isMobile]);

    return (
      <div className={styles.catalogPageMain}>
        <Header />
        <div className={styles.catalogContent}
             style={isMobile ? { width: '100%' } : { width: `${contentWidth}px`, margin: '0 auto' }}>

          <div className={styles.catalogHeader}>
            <div>
              <CatalogMetadata />
              {(isEditMode || isCreateMode) && (
                <UpdateToolbar
                  contentWidth={contentWidth}
                  isMobile={isMobile}
                  handleCancelChanges={handleCancelChanges}
                  handleSaveChanges={handleSave}
                />
              )}
            </div>
          </div>

          {(isEditMode || isCreateMode) && (
            <ImageUploadList
              previewData={previewData}
              setPreviewData={setPreviewData}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
            />
          )}

          {!isCreateMode && (
            <div className={styles.photoBlockWrapper}>
              {imageChunks && imageChunks.length > 0 ? (
                imageChunks.map((photoPair) => (
                  <PhotoBlockComponent
                    key={photoPair[0].id}
                    componentWidth={contentWidth}
                    isMobile={isMobile}
                    photos={photoPair}
                  />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <p>No images yet. Click "Upload Images" to add images.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {imageSelected && (
          <ImageFullScreen
            setImageSelected={setImageSelected}
            imageSelected={imageSelected}
          />
        )}
      </div>
    );
  }
;

export default CatalogPage;