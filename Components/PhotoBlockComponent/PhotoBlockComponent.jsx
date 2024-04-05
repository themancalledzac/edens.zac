import styles from "../../styles/Home.module.scss";
import { useEffect, useState } from "react";

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


export default function PhotoBlockComponent( { photos, setSelectedPhoto, setSelect } ) {
    const [componentWidth, setComponentWidth] = useState( 800 );
    const [loading, setLoading] = useState( true );
    const [imageOne, setImageOne] = useState( photos[ 0 ] );
    const [imageTwo, setImageTwo] = useState( photos.length > 1 ? photos[ 1 ] : null );
    const handleClick = ( image ) => {
        setSelectedPhoto( image );
        console.log( image );
    }

    useEffect( () => {
        try {
            console.log( 'useEffect before calculateImageSizes', { photos } );
            const calculatedValues = calculateImageSizes( photos, componentWidth );
            console.log( 'useEffect after calculateImageSizes', { calculatedValues } );
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
        <div style={{
            display: 'flex',
            width: `${componentWidth}px`,
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <img src={isValidSource( imageOne?.title ) ? `/${imageOne.title}` : ""}
                 alt="Photo"
                 className={styles.imageOne}
                 style={{ width: `${imageOne.width}px`, height: `${imageOne.height}px`, objectFit: 'contain' }}
                 onClick={() => handleClick( imageOne )}/>
            {imageTwo && (
                <img src={isValidSource( imageTwo.title ) ? `/${imageTwo.title}` : ""}
                     alt="Photo"
                     className={styles.imageTwo}
                     style={{ width: `${imageTwo.width}px`, height: `${imageTwo.height}px`, objectFit: 'contain' }}
                     onClick={() => handleClick( imageTwo )}/>
            )}
        </div>
    );
};
