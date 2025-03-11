import styles from './ImageFullScreen.module.scss';
import React, {useEffect, useState} from "react";
import SideBar from "../SideBar/SideBar";
import Image from "next/image";

const isValidSource = (title) => {
    return title && title !== "";
};

export default function ImageFullScreen({imageSelected, setImageSelected}) {
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [screenSize, setScreenSize] = useState({width: window.innerWidth, height: window.innerHeight});
    const [imageStyle, setImageStyle] = useState({});
    const [sidebarWidth, setSidebarWidth] = useState("0px");

    useEffect(() => {
        const handleResize = () => {
            setScreenSize({width: window.innerWidth, height: window.innerHeight});
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

        // Cleanup
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [setImageSelected]);

    useEffect(() => {
        // Assuming imageSelected includes naturalWidth and naturalHeight
        if (!imageSelected) return;
        const {imageWidth, imageHeight} = imageSelected;

        // Adjust the image size based on its orientation and screen size
        if (imageWidth > imageHeight) {
            // Horizontal image
            setImageStyle({
                maxWidth: '90%',
                height: 'auto',
            });
        } else {
            // Vertical image
            setImageStyle({
                maxWidth: 'auto',
                maxHeight: '100%',
            });
        }
    }, [screenSize, imageSelected]);

    // Not yet working as NextJS Image is taking 100% of screen. investigating
    const handleClickOutside = () => {
        setImageSelected(null);
    };

    const handleImageClick = (e) => {
        e.stopPropagation(); // prevent triggering handleClickOutside
        setImageSelected(null);
    }

    const handleClick = () => {
        setImageSelected(null);
    }

    // const handleMetadataClick = () => {
    //     // setSidebarVisible( !sidebarVisible );
    // };

    // Adjust the imageFullScreenWrapper style to incorporate sidebar
    // For horizontal orientation and when sidebar is not visible, subtract sidebar width
    const wrapperStyle = screenSize.width > screenSize.height && !sidebarVisible ? {
        display: 'flex',
    } : {};

    return (
        <div className={styles.imageFullScreenWrapper} onClick={handleClickOutside}>
            <Image
                src={isValidSource(imageSelected?.imageUrlWeb) ? `${imageSelected.imageUrlWeb}` : ""}
                alt={'Photo'}
                width={Math.round(imageSelected.width)}
                height={Math.round(imageSelected.height)}
                style={{
                    ...imageStyle,
                    backgroundColor: "rgba(17, 17, 17, 0.75)",
                }}
                onClick={handleImageClick}
            />
            {/* Conditional rendering for SideBar based on orientation */}
            {sidebarVisible &&
                <SideBar image={imageSelected} width={sidebarWidth}
                         screenVertical={screenSize.width > screenSize.height}/>}
            <button
                className={styles.closeButton}
                onClick={handleClick}>
                &#10005; {/* This is the HTML entity for a multiplication sign (X) */}
            </button>
        </div>
    )
}