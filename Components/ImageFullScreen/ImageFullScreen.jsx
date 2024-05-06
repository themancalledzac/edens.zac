import Image from "next/image";
import styles from './ImageFullScreen.module.scss';
import React, { useEffect, useState } from "react";
import SideBar from "../SideBar/SideBar";

const isValidSource = ( title ) => {
    return title && title !== "";
};

export default function ImageFullScreen( { imageSelected, setImageSelected } ) {
    const [isZoomed, setIsZoomed] = useState( false );
    const [sidebarVisible, setSidebarVisible] = useState( false );
    const [screenSize, setScreenSize] = useState( { width: window.innerWidth, height: window.innerHeight } );
    const [imageStyle, setImageStyle] = useState( {} );
    const [sidebarWidth, setSidebarWidth] = useState( "0px" );

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
                    maxWidth: screenSize.width > screenSize.height && !sidebarVisible ? `calc(100% - ${sidebarWidth})` : '90%',
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
    console.log( sidebarWidth );

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

    const handleMetadataClick = () => {
        // setSidebarVisible( !sidebarVisible );
    };

    // Adjust the imageFullScreenWrapper style to incorporate sidebar
    // For horizontal orientation and when sidebar is not visible, subtract sidebar width
    const wrapperStyle = screenSize.width > screenSize.height && !sidebarVisible ? {
        display: 'flex',
    } : {};

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

// // Adjust the imageFullScreenWrapper style if needed
// const imageFullScreenWrapperStyle = {
//     width: '100%',
//     height: '100vh', // Full viewport height
//     display: 'flex',
//     flexDirection: 'column', // Default to column, but it will be overridden if sidebarVisible
//     justifyContent: 'center',
//     alignItems: 'center',
// };
//
// // Define parent component styles
// const parentComponentStyle = {
//     display: sidebarVisible ? 'flex' : 'block', // Flex layout when sidebar is visible
//     width: '100%', // Full screen width
//     flexDirection: 'row', // Horizontal layout
//     alignItems: 'center', // Center items vertically
//     justifyContent: 'center', // Center items horizontally
// };
//
// // TODO:
// //  1. Need state from user of 'ifAdmin', Edit button is visible.
// //  2. Edit button would open the sidebar. basically, without the edit button, the sidebar doesn't exist. we could even have two imageFullScreen, based on userstate? hmm
// //  3. How do we keep this SECURE. need to research
// //  4. Do we even have 'edit' available on the website? maybe these are LOCAL only endpoints
// //  5. SideBar, then, is just INFO
// //  6. Info, is just a few items. they are Selectable, such as Catalog.
// //  7. Sidebar could also have a 'definition', or otherwise, for explaining the situation.
// //  8. Parent component should have a minimum margin so that we have a slight space all the way around, within the window.
//
// return (
//     <div className={styles.imageFullScreenWrapper} style={imageFullScreenWrapperStyle} onClick={handleClickOutside}>
//         <div style={parentComponentStyle}>
//             {/* Image component */}
//             <div style={{ width: sidebarVisible ? '80%' : '100%' }}>
//                 <img
//                     src={isValidSource( imageSelected?.title ) ? `/${imageSelected.title}` : ""}
//                     alt={'Photo'}
//                     style={{
//                         width: '100%',
//                         height: 'auto',
//                         backgroundColor: "rgba(17, 17, 17, 0.75)",
//                     }}
//                     onClick={handleImageClick}
//                 />
//             </div>
//
//             {/* Conditional rendering for SideBar based on visibility */}
//             {sidebarVisible &&
//                 <SideBar image={imageSelected} width={'20%'}
//                          screenVertical={screenSize.width > screenSize.height}/>
//             }
//         </div>
//         <button className={styles.closeButton} onClick={() => setImageSelected( null )}>
//             &#10005; {/* This is the HTML entity for a multiplication sign (X) */}
//         </button>
//     </div>
// );
