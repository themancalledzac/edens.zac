import styles from "../../styles/Home.module.scss";
import React, {useEffect, useState} from "react";
import ImageFullScreen from "../ImageFullScreen/ImageFullScreen";
import Image from "next/image";
import {calculateImageSizes} from "@/utils/imageUtils";

/**
 * Photo Block Component which can contain 1 or 2 images, depending on Rating.
 * @param {Array} photos
 * @param {boolean} isMobile
 * @param {number} componentWidth
 * @param {Image} imageSelected
 * @param {Function} setImageSelected Function to update the selected image state
 * @constructor
 */
export default function PhotoBlockComponent({
                                                componentWidth,
                                                photos,
                                                isMobile,
                                                imageSelected,
                                                setImageSelected
                                            }) {
    const [loading, setLoading] = useState(true);
    const [imageOne, setImageOne] = useState(photos[0]);
    const [imageTwo, setImageTwo] = useState(photos.length > 1 ? photos[1] : null);
    const [imageThree, setImageThree] = useState(photos.length > 2 ? photos[2] : null);
    const handleClick = async (image) => {
        await setImageSelected(image);
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

    const isValidSource = (title) => {
        return title && title !== "";
    };

    if (loading) {
        return <div></div>
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
                <Image src={isValidSource(imageOne?.imageUrlWeb) ? `${imageOne.imageUrlWeb}` : ""}
                       alt="Photo"
                       width={Math.round(imageOne.width)}
                       height={Math.round(imageOne.height)}
                       className={styles.imageOne}
                       unoptimized={true}
                       onClick={() => handleClick(imageOne)}
                />
                {imageTwo && (
                    <Image src={isValidSource(imageTwo.imageUrlWeb) ? `${imageTwo.imageUrlWeb}` : ""}
                           alt="Photo"
                           className={imageThree ? styles.imageTwoOfThree : styles.imageTwo}
                           width={Math.round(imageTwo.width)}
                           height={Math.round(imageTwo.height)}
                           onClick={() => handleClick(imageTwo)}
                    />
                )}
                {imageThree && (
                    <Image src={isValidSource(imageThree.imageUrlWeb) ? `${imageThree.imageUrlWeb}` : ""}
                           alt="Photo"
                           className={styles.imageThree}
                           width={Math.round(imageThree.width)}
                           height={Math.round(imageThree.height)}
                           onClick={() => handleClick(imageThree)}
                    />
                )}
            </div>
        </>
    );
};
