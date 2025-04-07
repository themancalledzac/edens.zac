import React, { useEffect, useMemo, useState } from 'react';

import CatalogMetadata from '@/Components/Catalog/CatalogMetadata';
import ImageUploadList, { PreviewImage } from '@/Components/Catalog/ImageUploadList';
import ImageUploadModule from '@/Components/Catalog/ImageUploadModule';
import { UpdateToolbar } from '@/Components/EditToolbar/UpdateToolbar';
import ImageFullScreen from '@/Components/ImageFullScreen/ImageFullScreen';
import PhotoBlockComponent from '@/Components/PhotoBlockComponent/PhotoBlockComponent';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import { fetchCatalogBySlug, updateCatalog } from '@/lib/api/catalogs';
import { Catalog } from '@/types/Catalog';
import { Image } from '@/types/Image';
import { CatalogPageProps, createEmptyCatalog } from '@/utils/catalogUtils';
import { chunkImages, swapImages } from '@/utils/imageUtils';

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
        catalog: null,
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
    selectedForSwap,
    setSelectedForSwap,
    editCatalog,
    setEditCatalog,
    isEditCoverImage,
    setIsEditCoverImage,
  } = useEditContext();

  const [contentWidth, setContentWidth] = useState(800);

  const imageChunks = useMemo(() => {
    // When editing, use editCatalog's images
    const sourceImages = isEditMode && editCatalog
      ? editCatalog?.images
      : currentCatalog?.images;
    return chunkImages(sourceImages, 3);
  }, [currentCatalog, editCatalog, isEditMode, catalog]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<PreviewImage[]>([]);

  useEffect(() => {
    if (create) {
      setIsCreateMode(true);
      setEditCatalog(createEmptyCatalog());
    } else if (catalog) {
      setCurrentCatalog(catalog);
      setEditCatalog(null);
    }
  }, [catalog, create, setCurrentCatalog, setEditCatalog, setIsEditMode]);

  /**
     * Hook that updates current catalog on update.
     */
  useEffect(() => {
    if (catalog && (!currentCatalog || currentCatalog.id !== catalog.id)) {
      setCurrentCatalog(catalog);
    }
  }, [catalog, currentCatalog]);

  /**
     * Function to handle Image position change.
     *
     * Our current edit image position entails the following logic:
     * First image clicked will set our image as 'selectedForSwap'.
     * If we click that first image again, we unselect it.
     * If we instead click a second image, we swap images, which causes a page rerender.
     *
     * @param image Image.
     */
  const handleImageSwitch = (image: Image) => {
    if (!editCatalog) return;

    if (selectedForSwap === null) {
      // first image selected
      setSelectedForSwap(image);
    } else if (selectedForSwap.id === image.id) {
      setSelectedForSwap(null);
    } else {
      // second image selected, swap
      const { newImages } = swapImages(editCatalog.images, selectedForSwap.id, image.id);

      // Update edit catalog with new image order
      setEditCatalog({
        ...editCatalog,
        images: newImages,
      });
      setSelectedForSwap(null);
    }
  };

  const handleSave = async () => {
    console.log('[zac] - in handleSave');
    try {
      if (isCreateMode) {
        console.log('[zac] - in handleSave - isCreateMode');
        // If we have images to upload, we need to include them in the request
        const formData = new FormData();
        console.log('[zac] - in handleSave - isCreateMode');

        // Add catalog data as JSON
        const catalogData = {
          title: editCatalog.title,
          location: editCatalog.location,
          priority: editCatalog.priority,
          tags: editCatalog.tags || [],
          people: editCatalog.people || [],
          coverImageUrl: editCatalog.coverImageUrl,
          date: editCatalog.date,
          createHomeCard: true,
        };

        formData.append('catalogDTO', JSON.stringify(catalogData));

        // Add any selected files
        for (const file of selectedFiles) {
          formData.append('images', file);
        }

        // API request :TODO: update this with our current route
        const response = await fetch('http://localhost:8080/api/v1/catalog/uploadCatalogWithImages', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        // Navigate to the new catalog
        window.location.href = `/catalog/${result.slug}`;

      } else {

        if (!editCatalog) return;

        const result = await updateCatalog(editCatalog);
        console.log('Before context update:', currentCatalog?.title);
        setCurrentCatalog(result);

        setIsEditMode(false);
        setEditCatalog(null);
      }

    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  /**
     * Handles an image click, either for Edit or for Full Screen.
     * @param image - Image.
     */
  const handleImageClick = (image: Image) => {
    if (isEditMode) {
      if (isEditCoverImage) {
        setEditCatalog({
          ...editCatalog,
          coverImageUrl: image.imageUrlWeb,
        });
        setIsEditCoverImage(!isEditCoverImage);
      } else {
        handleImageSwitch(image);
      }
    } else {
      setImageSelected(image);
    }
  };

  /**
     * Handle canceling edit/create mode
     */
  const handleCancel = () => {
    if (isCreateMode) {
      // Navigate back to home page
      setIsEditMode(false);
      setIsCreateMode(false);
      window.location.href = '/';
    } else {
      setIsEditMode(false);
      setEditCatalog(null);
    }
  };

  /**
     * Hook to handle Catalog in Update/Edit mode.
     */
  useEffect(() => {
    if (isEditMode) {
      setEditCatalog({
        ...currentCatalog,
      });
    } else {
      setEditCatalog(null);
    }
  }, [isEditMode, currentCatalog, setEditCatalog]);

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

  // TODO:
  //  - On select files, only 1 at a time is showing, but 'selectedFiles' shows them all?
  //  - If you select more files, it seems to overwrite previous 'selectedFiles'
  //  - On Create: if you 'cancel' image upload, we see the rest of the 'create' page, but no longer can upload images
  //  - On Create: the rest of the 'create' boxes aren't visible on load, unless we 'cancel' image upload box
  //  - On Update: Give a 'success' indicator.

  /**
     * Handle image selection
     */
  const handleImagesSelected = (files: File[]) => {
    // This will be called by the ImageUploadModule component
    console.log('Selected files:', files);
    // We'll handle this data in state already
  };

  return (
    <div className={styles.catalogPageMain}>
      <Header />
      <div className={styles.catalogContent}
        style={isMobile ? { width: '100%' } : { width: `${contentWidth}px`, margin: '0 auto' }}>

        <div className={styles.catalogHeader}>
          <div className={styles.catalogHeaderLeft}>
            <CatalogMetadata contentWidth={contentWidth} />
          </div>

          {(isEditMode || isCreateMode) && (
            <div className={styles.catalogHeaderRight}>
              <ImageUploadModule
                onImagesSelected={handleImagesSelected}
              />
            </div>
          )}
        </div>
      </div>

      {(isEditMode || isCreateMode) && (
        <>
          <UpdateToolbar
            contentWidth={contentWidth}
            isMobile={isMobile}
            handleCancelChanges={handleCancel}
            handleSaveChanges={handleSave}
          />
          <ImageUploadList
            previewData={previewData}
            setPreviewData={setPreviewData}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
          />
        </>
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
                handleImageClick={
                  (isCreateMode || isEditCoverImage)
                    ? handleImageClick
                    : handleImageSwitch
                }
                selectedForSwap={selectedForSwap}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>No images yet. Click "Upload Images" to add images.</p>
            </div>
          )}
        </div>
      )}

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