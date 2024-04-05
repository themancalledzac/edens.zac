import React, { useEffect, useRef } from 'react';
import styles from '../../styles/ParallaxSection.module.scss'; // Adjust the path as needed
import imageDirectory from "../../Images/imageDirectory.json";
import { useRouter } from 'next/router';

export default function ParallaxSection( { title, bannerImage, setCurrentAdventure } ) {
    const sectionRef = useRef( null );
    const router = useRouter();

    const handleClick = () => {
        // Assuming you have pages named after the titles
        // e.g., pages/amsterdam.js for "Amsterdam"
        // setCurrentAdventure( title );
        const urlTitle = title.toLowerCase().replace( /\s+/g, '-' );
        router.push( `/${urlTitle}` );
    };

    const handleScroll = () => {
        if ( sectionRef.current ) {
            // Calculate the offset of the section from the top of the viewport
            const rect = sectionRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;

            // Calculate the distance from the center of the section to the center of the viewport
            const sectionMidpoint = rect.top + ( rect.height / 2 );
            const viewportMidpoint = viewportHeight / 2;
            const distanceFromViewportCenter = sectionMidpoint - viewportMidpoint;

            // Adjust the background position based on the distance from the viewport center
            // The multiplier (e.g., 0.5) controls the speed of the parallax effect
            // You might need to adjust this multiplier to get the desired effect
            const offset = distanceFromViewportCenter * 0.5;

            sectionRef.current.style.backgroundPosition = `center calc(50% + ${offset}px)`;
        }
    };

    // Inline style for background image
    // const imageObject = imageDirectory.find( bannerImage );
    const titleImage = bannerImage;
    const imagePath = `/${bannerImage}`;
    const sectionStyle = {
        backgroundImage: `url(${imagePath})`,
    };
    // const imageList = imageObject ? imageObject.photoList : 'none returned';


    useEffect( () => {
        window.addEventListener( 'scroll', handleScroll );

        // Initial call for setting position correctly on load
        handleScroll();

        return () => window.removeEventListener( 'scroll', handleScroll );
    }, [] );

    return (
        <div onClick={handleClick} ref={sectionRef} className={styles.parallaxSection} style={sectionStyle}>
            <h1 className={styles.parallaxSectionTitle}>{title}</h1>
        </div>
    )
};
