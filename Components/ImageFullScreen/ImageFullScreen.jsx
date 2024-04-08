import Image from "next/image";
import styles from './ImageFullScreen.module.scss';
import React, { useEffect, useState } from "react";

const isValidSource = ( title ) => {
    return title && title !== "";
};

export default function ImageFullScreen( { imageSelected, setImageSelected } ) {
    const [isZoomed, setIsZoomed] = useState( false );
    const [screenSize, setScreenSize] = useState( { width: window.innerWidth, height: window.innerHeight } );
    const [imageStyle, setImageStyle] = useState( {} );

    useEffect( () => {
        const handleResize = () => {
            setScreenSize( { width: window.innerWidth, height: window.innerHeight } );
        };

        window.addEventListener( "resize", handleResize );
        return () => window.removeEventListener( "resize", handleResize );
    }, [] );

    useEffect( () => {
        const handleKeyDown = ( event ) => {
            if ( event.key === "Escape" ) {
                setImageSelected( null );
            }
        };

        window.addEventListener( "keydown", handleKeyDown );

        // Cleanup
        return () => window.removeEventListener( "keydown", handleKeyDown );
    }, [setImageSelected] );

    useEffect( () => {
        // Assuming imageSelected includes naturalWidth and naturalHeight
        if ( !imageSelected ) return;
        const { imageWidth, imageHeight } = imageSelected;

        if ( isZoomed ) {
            setImageStyle( {
                width: imageWidth > imageHeight ? '100%' : 'auto',
                height: imageWidth > imageHeight ? 'auto' : '100%',
                cursor: "move",
            } );
        } else {
            // Adjust the image size based on its orientation and screen size
            if ( imageWidth > imageHeight ) {
                // Horizontal image
                setImageStyle( {
                    maxWidth: '100%',
                    height: 'auto',
                } );
            } else {
                // Vertical image
                setImageStyle( {
                    maxWidth: 'auto',
                    maxHeight: '100%',
                } );
            }
        }
    }, [screenSize, imageSelected, isZoomed] );

    // Not yet working as NextJS Image is taking 100% of screen. investigating
    const handleClickOutside = () => {
        if ( isZoomed ) {
            setIsZoomed( false );
        } else {
            setImageSelected( null );
        }
    };

    const handleImageClick = ( e ) => {
        e.stopPropagation(); // prevent triggering handleClickOutside
        setIsZoomed( !isZoomed );
    }

    const handleClick = () => {
        setImageSelected( null );
    }
    console.log( 'isZoomed: ' + isZoomed );

    return (
        <div className={styles.imageFullScreenWrapper} onClick={handleClickOutside}>
            <img
                src={isValidSource( imageSelected?.title ) ? `/${imageSelected.title}` : ""}
                alt={'Photo'}
                style={{
                    ...imageStyle,
                    backgroundColor: "rgba(17, 17, 17, 0.75)",
                }}
                onClick={handleImageClick}
            />
            <button
                className={styles.closeButton}
                onClick={handleClick}>
                &#10005; {/* This is the HTML entity for a multiplication sign (X) */}
            </button>
            {/*<Image*/}
            {/*    src={isValidSource( imageSelected?.title ) ? `/${imageSelected.title}` : ""}*/}
            {/*    alt={'Photo'}*/}
            {/*    layout="fill"*/}
            {/*    objectFit={isZoomed ? "cover" : "contain"}*/}
            {/*    priority={true}*/}
            {/*    style={{*/}
            {/*        backgroundColor: "rgba(17, 17, 17, 0.75)",*/}
            {/*        cursor: isZoomed ? "move" : "default",*/}
            {/*    }}*/}
            {/*    onClick={handleImageClick}*/}
            {/*/>*/}
        </div>
    )
}
