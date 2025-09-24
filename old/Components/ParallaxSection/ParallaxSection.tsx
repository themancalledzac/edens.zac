// TODO:deprecate (Phase 5.2 end): Legacy Components retained during hybrid migration
/*
import { throttle } from 'lodash';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';

import { useAppContext } from '@/context/AppContext';
import { type HomeCardModel } from '@/types/HomeCardModel';

import styles from '../../styles/ParallaxSection.module.scss'; // Adjust the path as needed

interface ParallaxSectionProps {
  card: HomeCardModel;
}

export function ParallaxSection({ card }: ParallaxSectionProps): React.JSX.Element {
  const { id, title, coverImageUrl, text, slug, cardType } = card;

  const sectionRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useAppContext();
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
    } catch (error) {
      console.error(`Handled error in handleClick in ParallaxSection, ${error}`);
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
  }, [handleScroll]);

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
}
*/

// Keep module non-empty to satisfy linting without providing legacy Components.
export {};
