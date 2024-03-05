import styles from "../../styles/Home.module.scss";
import { useEffect, useState } from "react";
import amsterdam from "../../Images/imageMetadata_amsterdam.json";
import paris from "../../Images/imageMetadata_paris.json";
import florence from "../../Images/imageMetadata_florence.json";
import rome from "../../Images/imageMetadata_rome.json";
import vienna from "../../Images/imageMetadata_vienna.json";

console.log( 'florence is: ' + amsterdam.length );
console.log( 'paris is: ' + paris.length );
console.log( 'florence is: ' + florence.length );
console.log( 'rome is: ' + rome.length );
console.log( 'rome is: ' + vienna.length );

function calculateImageSizes( images, componentWidth ) {
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

// Example usage
const images = [{ 'title': 'image01', 'ratio': [2, 3] }, { 'title': 'image02', 'ratio': [5, 7] }];
const componentWidth = 1000;
const sizes = calculateImageSizes( images, componentWidth );

// console.log( sizes );


function calculateStylesForPhotoPair( photos, componentWidth = 1300 ) {
    // Aspect ratios
    const horizontalAspectRatio = 3 / 2;
    const verticalAspectRatio = 2 / 3;

    let styles = [];
    let parentHeight;

    // Determine pairing type
    const isBothHorizontal = photos.every( photo => photo.horizontal === true );
    const isMixed = photos.length === 2 && ( photos[ 0 ].horizontal / photos[ 0 ].vertical ) !== ( photos[ 1 ].horizontal / photos[ 0 ].vertical );
    const isBothVertical = photos.every( photo => photo.horizontal === false );

    if ( isBothHorizontal ) {
        // Horizontal/Horizontal
        const width = componentWidth / 2; // Each image takes half the total width
        parentHeight = width / horizontalAspectRatio; // Height based on individual image width
    } else if ( isBothVertical ) {
        // Vertical/Vertical
        parentHeight = 975; // Height is greater due to vertical aspect ratio
    } else if ( isMixed ) {
        // Mixed Horizontal/Vertical
        // Since the mixed scenario aims to keep the vertical image's long side equal to the horizontal image's short side
        // And given the component width, we adjust the calculation to reflect this requirement
        parentHeight = ( componentWidth * 6 ) / 13; // Adjusted to maintain aspect ratio across both images
    }

    // Calculate styles after determining parentHeight
    if ( isBothHorizontal || isBothVertical ) {
        styles = photos.map( photo => ( {
            width: `${componentWidth / 2}px`,
            height: `${parentHeight}px`,
            objectFit: 'contain',
        } ) );
    } else if ( isMixed ) {
        const horizontalImageWidth = componentWidth * ( 9 / 13 );
        const verticalImageWidth = componentWidth * ( 4 / 13 );

        styles = photos.map( photo => ( {
            width: `${photo.horizontal ? horizontalImageWidth : verticalImageWidth}px`,
            height: `${parentHeight}px`,
            objectFit: 'contain',
        } ) );
    }

    return { styles, parentHeight };
}

// const { styles, parentHeight } = calculateStylesForPhotoPair( photos );


export default function PhotoBlockComponent( { photos } ) {
    const [componentWidth, setComponentWidth] = useState( 1000 );
    const [imageOne, setImageOne] = useState( photos[ 0 ] );
    const [imageTwo, setImageTwo] = useState( photos[ 1 ] );


    useEffect( () => {
        const calculatedValues = calculateImageSizes( photos, componentWidth );
        // console.log( calculatedValues );
        setImageOne( calculatedValues[ 0 ] );
        setImageTwo( calculatedValues[ 1 ] );
    }, [photos, componentWidth] );

    // console.log( calculatedValues );
    // console.log( photos );


    return (
        <div style={{
            display: 'flex',
            width: `${componentWidth}px`,
            height: `${imageOne.height}px`, // Make sure this is set correctly
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <img src={`/${imageOne.title}`} alt={`Photo ${imageOne.title}`}
                 style={{ width: `${imageOne.width}px`, height: `${imageOne.height}px` }}/> {/* Added units */}
            <img src={`/${imageTwo.title}`} alt={`Photo ${imageTwo.title}`}
                 style={{ width: `${imageTwo.width}px`, height: `${imageTwo.height}px` }}/> {/* Added units */}
        </div>
    );
};


// 2x3 and 3x2

// 6 x 9 and 4 x 6

// width = 9 + 4 = 13
// height = 9


// componentWidth = 900px
// componentHeight = 600px

// verticalImageWidth = componentWidth - horizontalImageWidth;
// verticalImageHeight / verticalImageWidth = horizontalImageWidth / horizontalImageHeight;
// verticalImageHeight = componentHeight = horizontalImageHeight;
// verticalImageWidth = (600 * 2) / 3 = 400px
// horizontalImageWidth = (600 * 3) / 2 = 900px
// componentWidth = 400 + 900
//
//
