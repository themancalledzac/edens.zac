import styles from "../../styles/Home.module.scss";
import React, {useEffect, useState} from "react";
import Image from "next/image";
import {Image as ImageType} from "@/types/Image";
import {calculateImageSizes, calculateImageSizesReturn, DisplayImage} from "@/utils/imageUtils";
import {useEditContext} from "@/context/EditContext";

interface PhotoBlockComponentProps {
    componentWidth: number;
    photos: ImageType[];
    isMobile: boolean;
    handleImageClick: (image: ImageType) => void;
    setImageSelected: (image: ImageType) => void;
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
                                                setImageSelected,
                                                selectedForSwap
                                            }: PhotoBlockComponentProps) {
    const [loading, setLoading] = useState(true);
    const {isEditMode} = useEditContext();
    const [imageItems, setImageItems] = useState<calculateImageSizesReturn[]>([]);

    const handleClick = (image: ImageType) => {
        if (handleImageClick) {
            handleImageClick(image);
        } else {
            setImageSelected(image);
        }
    }

    useEffect(() => {
        try {
            const calculatedValues = calculateImageSizes(photos, componentWidth);
            setImageItems(calculatedValues);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [photos, componentWidth]);

    const getPositionStyle = (index: number, totalImages: number): string => {
        if (totalImages === 1) return styles.imageSingle;
        if (index === 0) return styles.imageLeft;
        if (index === totalImages - 1) return styles.imageRight;
        return styles.imageMiddle;
    }

    const isValidSource = (title: string) => {
        return title && title !== "";
    };

    if (loading || imageItems.length === 0) {
        return <div></div>
    }

    const isSelected = (image: ImageType) => {
        return selectedForSwap && selectedForSwap.id === image?.id;

    }

    return (
        <>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                ...(isMobile
                        ? {marginBottom: '0', flexDirection: 'column'}
                        : {marginBottom: '1rem', flexDirection: 'row'}
                )
            } as React.CSSProperties}>
                {imageItems.map((item, index) => (
                    item && item.image && isValidSource(item.image.imageUrlWeb) && (
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
                            unoptimized={true}
                            onClick={() => handleClick(item.image)}
                            style={{
                                ...(index === 0 && !isMobile ? {paddingRight: '0.4rem'} : {}),
                                ...(index > 0 && index < imageItems.length - 1 && !isMobile ? {
                                    paddingLeft: '0.4rem',
                                    paddingRight: '0.4rem'
                                } : {}),
                                ...(index === imageItems.length - 1 && index !== 0 && !isMobile ? {paddingLeft: '0.4rem'} : {})
                            }}
                        />
                    )
                ))}
            </div>
        </>
    );
};
