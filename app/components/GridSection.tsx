'use client';

import Link from 'next/link';
import { HomeCardModel } from '@/types/HomeCardModel';
import { useParallax } from '../hooks/useParallax';
import styles from '../page.module.scss';

interface GridSectionProps {
  card: HomeCardModel;
}

export function GridSection({ card }: GridSectionProps) {
  const { title, coverImageUrl, text, slug, cardType } = card;
  const parallaxRef = useParallax();

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
    <Link href={getHref()} className={styles.gridSection} ref={parallaxRef}>
      <div
        className={`${styles.gridBackground} parallax-bg`}
        style={{ backgroundImage: `url(${coverImageUrl})` }}
      />
      <div className={styles.gridContent}>
        <h1 className={styles.gridTitle}>{title}</h1>
        {text && <p className={styles.gridText}>{text}</p>}
        <div className={styles.cardTypeBadge}>
          {cardType}
        </div>
      </div>
    </Link>
  );
}