import styles from "../styles/Home.module.css";
import { imageData } from "../Assets/imageData";
import CarouselImage from "./CarouselImage";
import { useEffect, useState } from "react";

// TODO: Move sortData() to a separate file... a Utility folder maybe
// TODO: Figure out why it's still being weird
// TODO: Update WIDtH changes for our array sorting with MUI standards.
// TODO: instead of always having 2 vertical with a horizontal, we could have different outcomes
// TODO: SUCH AS: vertical and horizontal only in the row, make them 1/3 and 2/3 max-width
let sortedData = [];

let sortData = ( imageData ) => {


    // TODO: need to redo logic here
    // TODO: Switch case?
    // TODO: go based off the number in rowLength

    const getImageLength = ( image ) => {
        return image.vertical ? 1 : 2;
    }

    let imageDataSorted = [];
    let tempHorizontalImageDump = [];
    let rowLength = 0;
    imageData.forEach( function ( image ) {

        rowLength === 4 ? rowLength = 0 : rowLength; // TODO VERIFY THIS IS WORKING


        // TODO: Figure out why this Switch Case isn't working. OTHERWISE, we refactor our currently working code, but i like the switch case better
        // TODO: Refactor so that we map through images and return a component that IS like a block of images.
        // TODO: this refactor means that a component containing a certain arrangement of images is returned, based on what images are given.
        // TODO: AKA, a vertial next to two horizontal images on top of eachother.
        // TODO: this could be based also on STAR RATING. 5 star images are full screen, 4 star are big images, and 3 are just regular sized like currently.
        // switch (rowLength) {
        //     case 0:
        //         //do something'
        //         // if one bucket or the other is empty, make sure to continue on both sides
        //         //TODO: check if to add from tempImageDump fiirst, or just current image.
        //         //TODO: This means that we can potentially add 2 images, if
        //         //TODO: Have a separate functions called 'AddImage' and 'VerifyLength' and '
        //         // TODO: Priority List: TEMP, IMAGE
        //         if ( tempHorizontalImageDump ) {
        //             imageDataSorted.push( tempHorizontalImageDump.pop() );
        //             rowLength += 2;
        //         }
        //         imageDataSorted.push( image );
        //         rowLength += getImageLength( image );
        //         break;
        //     case 1:
        //         //do something'
        //         if ( tempHorizontalImageDump ) {
        //             imageDataSorted.push( tempHorizontalImageDump.pop() );
        //             rowLength += 2;
        //         }
        //         if ( image.vertical ) {
        //             imageDataSorted.push( image );
        //             rowLength += getImageLength( image );
        //         } else {
        //             tempHorizontalImageDump.push( image );
        //         }
        //         break;
        //     case 2:
        //         //do something'
        //         if ( tempHorizontalImageDump ) {
        //             imageDataSorted.push( tempHorizontalImageDump.pop() );
        //             rowLength = 0;
        //         }
        //         imageDataSorted.push( image );
        //         rowLength += getImageLength( image );
        //     case 3:
        //         //do something'
        //         if ( image.vertical ) {
        //             imageDataSorted.push( image );
        //         } else {
        //             tempHorizontalImageDump.push( image );
        //         }
        //     default:
        //         imageDataSorted.push( image );
        //         break;
        //     //do something'
        //
        // }


        if ( tempHorizontalImageDump.length && rowLength <= 2 ) {
            imageDataSorted.push( tempHorizontalImageDump.pop() );
            rowLength += 2;
        }
        if ( !image.vertical ) {
            if ( rowLength === 2 ) {
                imageDataSorted.push( image );
                rowLength = 0;
            } else if ( rowLength < 2 ) {
                imageDataSorted.push( image );
                rowLength += 2;
            } else {
                tempHorizontalImageDump.push( image );
            }
        }
        if ( image.vertical ) {
            imageDataSorted.push( image );
            rowLength += 1;
        }
        if ( rowLength >= 4 ) {
            rowLength == 0;
        }
    } );
    if ( tempHorizontalImageDump.length ) {
        imageDataSorted.push( tempHorizontalImageDump );
    }
    return sortedData = imageDataSorted;

};

export default function ImageCarousel( { images } ) {
    const [sortedData, setSortedData] = useState( [] );
    useEffect( () => {
        setSortedData( sortData( imageData ) );
    }, [] );


    return (
        <div className={styles.mainCard}>
            {sortedData.map( ( image ) => (
                // eslint-disable-next-line react/jsx-key
                <CarouselImage image={image}/>
            ) )}
        </div>
    )
}


// TODO: LOGIC
// 3 units wide
// Horizontal is 2 units
// Vertical is 1 unit
