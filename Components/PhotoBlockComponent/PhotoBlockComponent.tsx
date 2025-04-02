import Image from 'next/image';
import React, { useEffect, useState } from 'react';

import { useEditContext } from '@/context/EditContext';
import { Image as ImageType } from '@/types/Image';
import { calculateImageSizes, calculateImageSizesReturn } from '@/utils/imageUtils';

import styles from '../../styles/Home.module.scss';

interface PhotoBlockComponentProps {
  componentWidth: number;
  photos: ImageType[];
  isMobile: boolean;
  handleImageClick: (image: ImageType) => void;
  selectedForSwap: ImageType;
}

/**
 * Photo Block Component which can contain 1 or 2 images, depending on Rating.
 */
export default function PhotoBlockComponent({
  componentWidth,
  photos,
  isMobile,
  handleImageClick,
  selectedForSwap,
}: PhotoBlockComponentProps) {
  const [loading, setLoading] = useState(true);
  const { isEditMode } = useEditContext();
  const [imageItems, setImageItems] = useState<calculateImageSizesReturn[]>([]);

  /**
   * Hook to calculate Image sizes, recalculated when photos or componentWidth change.
   * This is an important hook in that, on reorder, this is in charge of recalculation.
   */
  useEffect(() => {
    try {
      // Filter out invalid images before calculation
      const validPhotos = photos.filter(photo => isValidUrl(photo?.imageUrlWeb));

      // if no valid photos, don't try to calculate sizes
      if (validPhotos.length === 0) {
        setImageItems([]);
        setLoading(false);
        return;
      }
      const calculatedValues = calculateImageSizes(photos, componentWidth);
      setImageItems(calculatedValues);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [photos, componentWidth]);

  /**
   * Associates images with their correct css styling based on images per block,
   * and image location(left/middle/right)
   *
   * @param index - What number image we are dealing with.
   * @param totalImages - Total number of images.
   * @returns Returns styling.
   */
  const getPositionStyle = (index: number, totalImages: number): string => {
    if (totalImages === 1) return styles.imageSingle;
    if (index === 0) return styles.imageLeft;
    if (index === totalImages - 1) return styles.imageRight;
    return styles.imageMiddle;
  };

  /**
   * Verifies image source.
   * Need to update for URL use cases.
   * @param url
   */
  const isValidUrl = (url?: string): boolean => {
    return !!url && url != '';
  };

  if (loading || imageItems.length === 0) {
    return <div />;
  }

  const isSelected = (image: ImageType): boolean => {
    return !!selectedForSwap && selectedForSwap.id === image?.id;

  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...(isMobile
        ? { marginBottom: '0', flexDirection: 'column' }
        : { marginBottom: '1rem', flexDirection: 'row' }
      ),
    } as React.CSSProperties}>
      {imageItems.map((item, index) => (
        item && item.image && isValidUrl(item.image.imageUrlWeb) && (
          <Image
            key={item.image.id}
            src={item.image.imageUrlWeb}
            alt="photo"
            width={Math.round(item.width)}
            height={Math.round(item.height)}
            className={`
                                ${getPositionStyle(index, imageItems.length)}
                                ${isEditMode && styles.imageEdit}
                                ${isSelected(item.image) && styles.imageSelected}
                            `}
            unoptimized
            onClick={() => handleImageClick(item.image)}
          />
        )
      ))}
    </div>
  );
};
