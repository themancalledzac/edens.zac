import React from 'react';

import PhotoBlockComponent from '@/Components/PhotoBlockComponent/PhotoBlockComponent';
import { useAppContext } from '@/context/AppContext';
import { useEditContext } from '@/context/EditContext';
import styles from '@/styles/Catalog.module.scss';
import { Image } from '@/types/Image';

interface CatalogViewProps {
  contentWidth: number;
  imageChunks: Image[][];
  handleImageClick: (image: Image) => void;
}

/**
 * Display-only view for a catalog
 */
const CatalogView: React.FC<CatalogViewProps> = ({
  contentWidth,
  imageChunks,
  handleImageClick,
}) => {
  const { isMobile, currentCatalog } = useAppContext();
  const { selectedForSwap } = useEditContext();

  if (!currentCatalog) {
    return <div>Loading catalog...</div>;
  }

  return (
    <div className={styles.catalogContent}>
      <div
        className={styles.catalogHeader}
        style={isMobile ? { width: '100%' } : { width: `${contentWidth}px`, margin: '0 auto' }}
      >
        <h1 className={styles.catalogTitle}>
          {currentCatalog.title}
        </h1>

        <p className={styles.catalogDescription}>
          {currentCatalog.description ||
            (currentCatalog.location ? `Photos from ${currentCatalog.location}` : '')}
        </p>
      </div>
    </div>
  )
  ;
};


export default CatalogView;