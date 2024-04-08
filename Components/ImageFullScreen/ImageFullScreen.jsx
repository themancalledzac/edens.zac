import Image from "next/image";
import styles from './ImageFullScreen.module.scss';
import React, { useEffect, useState } from "react";

const isValidSource = ( title ) => {
    return title && title !== "";
};

export default function ImageFullScreen( { imageSelected, setImageSelected } ) {
    const [isZoomed, setIsZoomed] = useState( false );

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
            <Image
                src={isValidSource( imageSelected?.title ) ? `/${imageSelected.title}` : ""}
                alt={'Photo'}
                layout="fill"
                objectFit={isZoomed ? "cover" : "contain"}
                priority={true}
                style={{
                    backgroundColor: "rgba(17, 17, 17, 0.75)",
                    cursor: isZoomed ? "move" : "default",
                }}
                onClick={handleImageClick}
            />
        </div>
    )
}
