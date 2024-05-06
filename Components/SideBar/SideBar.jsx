import styles from "../../styles/Home.module.scss";
import imageDirectory from "../../Images/imageDirectory.json";
import ParallaxSection from "../ParallaxSection/ParallaxSection";
import { useEffect, useRef } from "react";
import SideBarItem from "../SideBarItem/SideBarItem";

export default function SideBar( { image, width, screenVertical } ) {
    console.log( image );

    return (
        <div className={styles.sidebarWrapper} style={{ width: `${width}` }}>
            <h1>title</h1>
            <h2>metadata...</h2>
            {/*{image.map( ( keyValue ) => (*/}
            {/*    <SideBarItem key={keyValue.key()} value={keyValue}/>*/}
            {/*) )}*/}
            {
                Object.entries( image ).map( ( [key, value] ) => {
                    // Skipping complex or unnecessary fields
                    if ( key === 'catalog' || key === 'imageUrlLarge' || key === 'imageUrlSmall' || key === 'imageUrlRaw' ) {
                        return null; // Skip rendering for these keys
                    }
                    return (
                        <div key={key}>
                            <strong>{key}</strong>: {Array.isArray( value ) ? value.join( ', ' ) : value}
                        </div>
                    );
                } )
            }
        </div>
    )
}

//
// catalog
//     :
//     ( 2 ) [ 'Amsterdam', 'Europe' ]
// author
//     :
//     "Zechariah Edens"
// blackAndWhite
//     :
//     false
// camera
//     :
//     "NIKON Z 6"
// createDate
//     :
//     "2023:10:13 01:12:51"
// focalLength
//     :
//     "52 mm"
// fstop
//     :
//     "f/8.0"
// height
//     :
//     532.16
// id
//     :
//     2
// imageHeight
//     :
//     1663
// imageUrlLarge
//     :
//     null
// imageUrlRaw
//     :
//     null
// imageUrlSmall
//     :
//     null
// imageWidth
//     :
//     2500
// iso
//     :
//     900
// lens
//     :
//     "NIKKOR Z 24-70mm f/4 S"
// location
//     :
//     null
// rating
//     :
//     5
// rawFileName
//     :
//     "_DSC0263.NEF"
// shutterSpeed
//     :
//     "1/24 sec"
// title
//     :
//     "_DSC0263.webp"
// updateDate
//     :
//     "2024-03-11T19:07:52.505689"
// width
//     :
//     800