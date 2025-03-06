import React, {useEffect, useRef, useState} from 'react';
import styles from '../../styles/ParallaxSection.module.scss'; // Adjust the path as needed
import {useRouter} from 'next/router';
import {useAppContext} from "@/context/AppContext";
import {throttle} from 'lodash';
import {Image} from "@/types/Image";

interface ParallaxSectionProps {
    catalogTitle?: string
    bannerImage?: string
    image?: Image
}

/**
 * Parallax Section for dynamic scrolling
 * @param catalogTitle
 * @param {string} bannerImage
 * @param {Image} image
 * @constructor
 */
export default function ParallaxSection({catalogTitle, bannerImage, image}) {


    const sectionRef = useRef(null);
    const {isMobile} = useAppContext();
    const router = useRouter();
    const [offset, setOffset] = useState(0);

    const handleClick = async () => {
        // TODO: Update:::::
        //  1. change to take 'slug'/'id' ( regardless of 'catalog/blog' )
        //  2. Debate ID vs SLUG for param do they coincide or clash if slugs are similar?
        //  3. Update 'Parallax' logic into a Utils file to keep this clean
        //  4. IS this a client component? since the user is interacting with it? (scroll)
        //  5. If it is a Client, what can we remove a layer in, to reduce the amount of client side code
        //  6.
        //  1.
        const catalog = catalogTitle.toLowerCase().replace(/\s+/g, '-');
        try {
            // todo #1
            await router.push(`/catalog/${catalog}`);
        } catch (e) {
            console.error(`Handled error in handleClick in ParallaxSection, ${e}`);
        }
    };

    // todo: #3
    const handleScroll = () => {
        if (sectionRef.current) {
            const rect = sectionRef.current.getBoundingClientRect();
            const scrollPercentage = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
            const parallaxMultiplier = isMobile ? 0.2 : 0.5;
            const newOffset = scrollPercentage * rect.height * parallaxMultiplier;

            setOffset(Math.min(Math.max(newOffset, -rect.height / 2), rect.height / 2));
        }
    };

    // todo: #5
    useEffect(() => {
        const throttledHandleScroll = throttle(handleScroll, 16);
        window.addEventListener('scroll', throttledHandleScroll);
        throttledHandleScroll(); // Initial call

        return () => window.removeEventListener('scroll', throttledHandleScroll);
    }, []);

    const imagePath = `/${bannerImage}`;

    return (
        <div onClick={handleClick} ref={sectionRef} className={styles.parallaxSection}>
            <div
                className={styles.parallaxBackground}
                style={{
                    backgroundImage: `url(${imagePath})`,
                    transform: `translateY(${offset}px)`,
                }}
            />
            <h1 className={styles.parallaxSectionTitle}>{catalogTitle}</h1>
        </div>
    );
};
