import styles from "../../styles/Home.module.scss";
import React, { useEffect, useState } from "react";
import ImageFullScreen from "../ImageFullScreen/ImageFullScreen";
import Image from "next/image";

// TODO:componentWidth
//  1. Need conditional Logic for, if 5 star && vertical, make max height, align-left(?)
//  2. If 5 star && description.notNull(), make description a 'part2' to our single image(?)
//  3. Need PhotoBlockComponent dictate the WIDTh of the images, as they only take up the INSIDE.
//  4. They don't have margin or padding INSIDE, instead, we use flex to have space-between.

function calculateImageSizes( images, componentWidth ) {

    if ( images.length === 1 ) {
        // Handle the single image case
        const ratio = images[ 0 ].imageWidth / images[ 0 ].imageHeight;
        const height = componentWidth / ratio;
        // const width = ratio * height;

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


export default function PhotoBlockComponent( { photos, isMobile, imageSelected, setImageSelected } ) {
    const [componentWidth, setComponentWidth] = useState( 800 );
    // const [imageSelected, setImageSelected] = useState( null );
    const [loading, setLoading] = useState( true );
    const [imageOne, setImageOne] = useState( photos[ 0 ] );
    const [imageTwo, setImageTwo] = useState( photos.length > 1 ? photos[ 1 ] : null );
    const handleClick = async ( image ) => {
        await setImageSelected( image );
    }

    useEffect( () => {
        const calculateComponentWidth = () => {
            if ( isMobile ) {
                return window.innerWidth - 32; // Subtract padding (16px on each side)
            } else {
                return Math.min( window.innerWidth * 0.8, 1200 ); // 80% of window width, max 1200px
            }
        };

        setComponentWidth( calculateComponentWidth() );

        const handleResize = () => {
            setComponentWidth( calculateComponentWidth() );
        };

        window.addEventListener( 'resize', handleResize );
        return () => window.removeEventListener( 'resize', handleResize );
    }, [isMobile] );

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
    // TODO
    //  1. Update WIDTH of our parent div here to be dynamic with the page. Look to the PhotographyPage < ParallaxSection interaction for inspiration. This would include a max-width at different screen widths, and then say, under 800, it would be full width dynamic.
    //  2. Images would need to have their width autmatically 'half' of the parent component ( or whatever the translation is from above )
    //  3. Images need to retain their Ratios, and

    return (
        <>
            <div style={{
                display: 'flex',
                width: `${componentWidth}px`,
                justifyContent: 'center',
                alignItems: 'center',
                ...( isMobile
                        ? { marginBottom: '0', flexDirection: 'column' }
                        : { marginBottom: '1rem', flexDirection: 'row' }
                )
            }}>
                <Image src={isValidSource( imageOne?.title ) ? `/${imageOne.title}` : ""}
                       alt="Photo"
                       width={Math.round( imageOne.width )}
                       height={Math.round( imageOne.height )}
                       className={styles.imageOne}
                       onClick={() => handleClick( imageOne )}
                       style={isMobile ? { margin: '0', width: '100%', height: 'auto' } : {
                           margin: '0',
                           marginRight: '0'
                       }}
                />
                {imageTwo && (
                    <Image src={isValidSource( imageTwo.title ) ? `/${imageTwo.title}` : ""}
                           alt="Photo"
                           className={styles.imageTwo}
                           width={Math.round( imageTwo.width )}
                           height={Math.round( imageTwo.height )}
                           onClick={() => handleClick( imageTwo )}
                           style={isMobile ? { margin: '0', width: '100%', height: 'auto' } : {
                               margin: '0',
                               marginLeft: '0'
                           }}
                    />
                )}
            </div>
            {imageSelected && (
                <ImageFullScreen setImageSelected={setImageSelected} imageSelected={imageSelected}/>
            )}
        </>
    );
};
