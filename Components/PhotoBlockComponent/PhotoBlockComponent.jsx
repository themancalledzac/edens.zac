import styles from "../../styles/Home.module.scss";
import React, { useEffect, useState } from "react";
import ImageFullScreen from "../ImageFullScreen/ImageFullScreen";
import Image from "next/image";

// TODO:
//  1. Need conditional Logic for, if 5 star && vertical, make max height, align-left(?)
//  2. If 5 star && description.notNull(), make description a 'part2' to our single image(?)
//  3. Need PhotoBlockComponent dictate the WIDTh of the images, as they only take up the INSIDE.
//  4. They don't have margin or padding INSIDE, instead, we use flex to have space-between.

function calculateImageSizes( images, componentWidth ) {
    if ( images.length === 1 ) {
        // Handle the single image case
        const ratio = images[ 0 ].imageWidth / images[ 0 ].imageHeight;
        const height = componentWidth / ratio;
        const width = ratio * height;

        return [{
            ...images[ 0 ],
            width: componentWidth,
            height: height
        }];
    } else {
        // Calculate the ratios using imageWidth and imageHeight from the input objects
        const ratio1 = images[ 0 ].imageWidth / images[ 0 ].imageHeight;
        const ratio2 = images[ 1 ].imageWidth / images[ 1 ].imageHeight;

        // Solve for the heights and widths
        const height = componentWidth / ( ratio1 + ratio2 );
        const width1 = ratio1 * height;
        const width2 = ratio2 * height;

        // Return the original objects with added calculated width and height
        return images.map( ( image, index ) => {
            // Calculate new size based on the index
            const newSize = index === 0 ? { width: width1, height: height } : { width: width2, height: height };

            // Spread the original image object and merge with the new size
            return { ...image, ...newSize };
        } );
    }
}


export default function PhotoBlockComponent( { photos } ) {
    const [componentWidth, setComponentWidth] = useState( 800 );
    const [imageSelected, setImageSelected] = useState( null );
    const [loading, setLoading] = useState( true );
    const [imageOne, setImageOne] = useState( photos[ 0 ] );
    const [imageTwo, setImageTwo] = useState( photos.length > 1 ? photos[ 1 ] : null );
    const handleClick = ( image ) => {
        setImageSelected( image );
        console.log( image );
    }

    useEffect( () => {
        try {
            const calculatedValues = calculateImageSizes( photos, componentWidth );
            setImageOne( calculatedValues[ 0 ] );
            if ( calculatedValues.length > 1 ) {
                setImageTwo( calculatedValues[ 1 ] );
            }
        } catch (error) {
            console.error( error );
        } finally {
            setLoading( false );
        }
    }, [photos, componentWidth] );

    const isValidSource = ( title ) => {
        return title && title !== "";
    };

    if ( loading ) {
        return <div></div>
    }

    return (
        <>
            <div style={{
                display: 'flex',
                width: `${componentWidth}px`,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Image src={isValidSource( imageOne?.title ) ? `/${imageOne.title}` : ""}
                       alt="Photo"
                       width={Math.round( imageOne.width )}
                       height={Math.round( imageOne.height )}
                       className={styles.imageOne}
                       onClick={() => handleClick( imageOne )}/>
                {imageTwo && (
                    <Image src={isValidSource( imageTwo.title ) ? `/${imageTwo.title}` : ""}
                           alt="Photo"
                           className={styles.imageTwo}
                           width={Math.round( imageTwo.width )}
                           height={Math.round( imageTwo.height )}
                           onClick={() => handleClick( imageTwo )}/>
                )}
            </div>
            {imageSelected && (
                <ImageFullScreen setImageSelected={setImageSelected} imageSelected={imageSelected}/>
            )}
        </>
    );
};
