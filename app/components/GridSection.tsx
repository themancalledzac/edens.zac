'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { type HomeCardModel } from '@/types/HomeCardModel';

import { useParallax } from '../hooks/useParallax';
import styles from '../page.module.scss';

interface GridSectionProps {
  card: HomeCardModel;
  desktopRowIndex: number;
  mobileRowIndex: number;
}

export function GridSection({ card, desktopRowIndex, mobileRowIndex }: GridSectionProps) {
  const { title, coverImageUrl, text, slug, cardType } = card;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize(); // Initial check
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const currentRowIndex = isMobile ? mobileRowIndex : desktopRowIndex;
  
  const parallaxRef = useParallax({
    rowId: `row-${currentRowIndex}`,
    speed: -0.1,
    selector: '.parallax-bg'
  });

  const getHref = () => {
    if (cardType === 'catalog') {
      return `/catalog/${slug}`;
    } else if (cardType === 'blog') {
      return `/blog/${slug}`;
    } else {
      return `/${cardType}/${slug}`;
    }
  };

  return (
    <div className={styles.gridSection} ref={parallaxRef}>
      <Link href={getHref()}>
        <div
          className={`${styles.gridBackground} parallax-bg`}
          style={{ backgroundImage: `url(${coverImageUrl})` }}
        />
        <div className={styles.gridContent}>
          <div className={styles.gridHeader}>
            <h1 className={styles.gridTitle}>{title}</h1>
          </div>
          {text && <p className={styles.gridText}>{text}</p>}
          <div className={styles.cardTypeBadge}>
            {cardType}
          </div>
        </div>
      </Link>
    </div>
  );
}