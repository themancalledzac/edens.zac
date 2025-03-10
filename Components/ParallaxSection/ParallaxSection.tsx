import React, {useEffect, useRef, useState} from 'react';
import styles from '../../styles/ParallaxSection.module.scss'; // Adjust the path as needed
import {useRouter} from 'next/router';
import {useAppContext} from "@/context/AppContext";
import {throttle} from 'lodash';
import {HomeCardModel} from "@/types/HomeCardModel";

interface ParallaxSectionProps {
    card: HomeCardModel;
}

export default function ParallaxSection({card}) {
    const {id, title, coverImageUrl, text, slug, cardType} = card;

    const sectionRef = useRef<HTMLDivElement>(null);
    const {isMobile} = useAppContext();
    const router = useRouter();
    const [offset, setOffset] = useState(0);

    const handleClick = async () => {
        try {
            if (cardType === 'catalog') {
                await router.push(`/catalog/${slug}`);
            } else if (cardType === 'blog') {
                await router.push(`/blog/${slug}`);
            } else {
                await router.push(`/${cardType}/${slug}`);
            }
        } catch (e) {
            console.error(`Handled error in handleClick in ParallaxSection, ${e}`);
        }
    }

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

    // const imagePath = `/${bannerImage}`;

    return (
        <div onClick={handleClick} ref={sectionRef} className={styles.parallaxSection}>
            <div
                className={styles.parallaxBackground}
                style={{
                    backgroundImage: `url(${coverImageUrl})`,
                    transform: `translateY(${offset}px)`,
                }}
            />
            <h1 className={styles.parallaxSectionTitle}>{title}</h1>
            {text && <p className={styles.parallaxSectionText}>{text}</p>}
        </div>
    );
};
