import styles from "../../styles/Home.module.scss";
import React, {useEffect, useState} from "react";
import ImageFullScreen from "../ImageFullScreen/ImageFullScreen";
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
    const [imageOne, setImageOne] = useState<calculateImageSizesReturn>({image: photos[0], height: 0, width: 0});
    const [imageTwo, setImageTwo] = useState<calculateImageSizesReturn | null>({
        image: (photos.length > 1 ? photos[1] : null),
        height: 0,
        width: 0
    });
    const [imageThree, setImageThree] = useState<calculateImageSizesReturn | null>({
        image: (photos.length > 2 ? photos[2] : null),
        height: 0,
        width: 0
    });
    const {isEditMode, setIsEditMode} = useEditContext();

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
            setImageOne(calculatedValues[0]);
            if (calculatedValues.length > 1) {
                setImageTwo(calculatedValues[1]);
            }
            if (calculatedValues.length > 2) {
                setImageThree(calculatedValues[2])
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [photos, componentWidth]);

    const isValidSource = (title: string) => {
        return title && title !== "";
    };

    if (loading || !imageOne.image.imageUrlWeb) {
        return <div></div>
    }

    const isSelected = (image: ImageType) => {
        return selectedForSwap && selectedForSwap.id === image?.id;

    }

    // TODO: Update this to simply map our items, and depending on the 'length' of the array being passed, we pass specific css classNames for specific padding styling
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
                <Image src={isValidSource(imageOne?.image?.imageUrlWeb) ? `${imageOne.image.imageUrlWeb}` : ""}
                       alt="Photo"
                       width={Math.round(imageOne?.width)}
                       height={Math.round(imageOne?.height)}
                       className={`
                            ${styles.imageOne} 
                            ${isEditMode && styles.imageEdit}
                            ${isSelected(imageOne.image) && styles.imageSelected}
                       `}
                       unoptimized={true}
                       onClick={() => handleClick(imageOne?.image)}
                />
                {imageTwo && (
                    <Image src={isValidSource(imageTwo?.image?.imageUrlWeb) ? `${imageTwo.image.imageUrlWeb}` : ""}
                           alt="Photo"
                           className={`
                              ${imageThree ? styles.imageTwoOfThree : styles.imageTwo}
                              ${isEditMode && styles.imageEdit}
                              ${isSelected(imageTwo.image) && styles.imageSelected}
                           `}
                           width={Math.round(imageTwo?.width)}
                           height={Math.round(imageTwo?.height)}
                           onClick={() => handleClick(imageTwo?.image)}
                    />
                )}
                {imageThree && (
                    <Image src={isValidSource(imageThree?.image?.imageUrlWeb) ? `${imageThree.image.imageUrlWeb}` : ""}
                           alt="Photo"
                           className={`
                               ${styles.imageThree} 
                               ${isEditMode && styles.imageEdit}
                               ${isSelected(imageThree.image) && styles.imageSelected}
                           `}
                           width={Math.round(imageThree.width)}
                           height={Math.round(imageThree.height)}
                           onClick={() => handleClick(imageThree?.image)}
                    />
                )}
            </div>
        </>
    );
};
