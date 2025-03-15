import styles from './ImageFullScreen.module.scss';
import React, {useCallback, useEffect, useMemo, useState} from "react";
import SideBar from "../SideBar/SideBar";
import Image from "next/image";

/**
 * Helper function to verify an image source is valid
 * @param src
 */
const isValidSource = (src) => {
    return src && src !== "";
};

/**
 * ImageFUllScreen component displays an image in fullscreen mode with metadata in a sidebar
 *
 * @param {Object} imageSelected The selected image object with metadata
 * @param {Function} setImageSelected Function to update the selected image state
 * @constructor
 */
export default function ImageFullScreen({imageSelected, setImageSelected}) {
    const SIDEBAR_WIDTH = 300; // Default sidebar width
    const [screenSize, setScreenSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1200,
        height: typeof window !== 'undefined' ? window.innerHeight : 800
    });
    const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});

    useEffect(() => {
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setImageSelected(null);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [setImageSelected]);

    const imageUrl = useMemo(() => {
        if (!imageSelected) return "";
        return isValidSource(imageSelected.imageUrlWeb) ? imageSelected.imageUrlWeb : "";
    }, [imageSelected]);

    /**
     * Calculates the optimal dimensions for the displayed image
     *
     * Logic:
     * 1. For vertical images:
     *    - Try to fill available height first
     *    - If width exceeds available space, scale down to fit width
     *    - This keeps vertical images centered with max height
     *
     * 2. For horizontal images:
     *    - Always constrain by available width (screen width minus sidebar)
     *    - If resulting height is too tall, scale down to fit height
     *    - This ensures horizontal images fully utilize available width
     *
     * The sidebar is always fixed at 300px on the right side of the screen.
     */
    const calculateDimensions = useCallback(() => {
        if (!imageSelected) return;

        const {imageWidth, imageHeight} = imageSelected;
        const aspectRatio = imageWidth / imageHeight;
        const isVertical = imageHeight > imageWidth;

        const availableWidth = screenSize.width - SIDEBAR_WIDTH - 20; // 10px padding on each side
        const availableHeight = screenSize.height - 20; // 10px padding top and bottom

        let width: number, height: number;

        if (isVertical) {
            // For vertical images, prefer constrain by height
            height = availableHeight;
            width = height * aspectRatio;

            // If width exceeds available width, constrain by width instead
            if (width > availableWidth) {
                width = availableWidth;
                height = width / aspectRatio;
            }
        } else {
            // For horizontal images, always constrain by width
            width = availableWidth;
            height = width / aspectRatio;

            // If height exceeds available height, adjust
            if (height > availableHeight) {
                height = availableHeight;
                width = height * aspectRatio;
            }
        }

        return {
            width: Math.round(width),
            height: Math.round(height)
        };
    }, [screenSize, imageSelected]);

    // Update dimensions when dependencies change
    useEffect(() => {
        setImageDimensions(calculateDimensions());
    }, [calculateDimensions]);

    const handleClickOutside = () => {
        setImageSelected(null);
    };

    const handleImageClick = (e) => {
        e.stopPropagation(); // prevent triggering handleClickOutside
        setImageSelected(null);
    }

    return (
        <div className={styles.imageFullScreenWrapper} onClick={handleClickOutside}>
            <div className={styles.imageContainer} onClick={handleImageClick}>
                {imageSelected && imageDimensions.height > 0 && (
                    <Image
                        src={imageUrl}
                        alt={'Photo'}
                        width={imageDimensions.width}
                        height={imageDimensions.height}
                        style={{
                            objectFit: "contain",
                            backgroundColor: "transparent",
                        }}
                        onClick={handleImageClick}
                        priority={true}
                        unoptimized={true}
                    />
                )}
                {/* Conditional rendering for SideBar based on orientation */}
                {imageSelected &&
                    <div className={styles.sidebar}>
                        <SideBar image={imageSelected} width={`${SIDEBAR_WIDTH}px`}/>
                    </div>
                }
            </div>
            <button
                className={styles.closeButton}
                onClick={handleClickOutside}>
                &#10005; {/* This is the HTML entity for a multiplication sign (X) */}
            </button>
        </div>
    )
}