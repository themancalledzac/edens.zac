import React, { useEffect, useRef } from 'react';
import styles from '../../styles/ParallaxSection.module.scss'; // Adjust the path as needed

const ParallaxSection = ( { title, imageLocation } ) => {
    const sectionRef = useRef( null );

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
    const imagePath = `/${imageLocation}`;
    const sectionStyle = {
        backgroundImage: `url(${imagePath})`,
    };


    useEffect( () => {
        window.addEventListener( 'scroll', handleScroll );

        // Initial call for setting position correctly on load
        handleScroll();

        return () => window.removeEventListener( 'scroll', handleScroll );
    }, [] );

    return (
        <div ref={sectionRef} className={styles.parallaxSection} style={sectionStyle}>
            <h1 className={styles.parallaxSectionTitle}>{imageLocation.slice( 0, -5 )}</h1>
        </div>
    )
};

export default ParallaxSection;
