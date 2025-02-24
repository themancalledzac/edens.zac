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
        const catalog = catalogTitle.toLowerCase().replace(/\s+/g, '-');
        try {
            await router.push(`/catalog/${catalog}`);
        } catch (e) {
            console.error(`Handled error in handleClick in ParallaxSection, ${e}`);
        }
    };

    const handleScroll = () => {
        if (sectionRef.current) {
            const rect = sectionRef.current.getBoundingClientRect();
            const scrollPercentage = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
            const parallaxMultiplier = isMobile ? 0.2 : 0.5;
            const newOffset = scrollPercentage * rect.height * parallaxMultiplier;

            setOffset(Math.min(Math.max(newOffset, -rect.height / 2), rect.height / 2));
        }
    };

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
