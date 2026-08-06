'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { useParallax } from '@/app/hooks/useParallax';

import styles from './CoverCard.module.scss';

export interface CoverCardProps {
  /** Destination of the whole-card link. */
  href: string;
  /** Overlay heading; also the link's accessible name when the cover is decorative. */
  title: string;
  imageUrl?: string | null;
  /** Intrinsic cover dimensions; both fall back to a 16:9 placeholder pair when unknown. */
  width?: number | null;
  height?: number | null;
  /** `sizes` for the cover — callers own their grid, so they own this. */
  sizes: string;
  /**
   * Cover `alt`. Defaults to `''` (decorative — the overlay title already names the link).
   * Pass a string only where the cover is meant to carry its own accessible name.
   */
  imageAlt?: string;
  /** Rendered beside the link inside the positioned wrapper, e.g. a FollowButton. */
  children?: ReactNode;
  /** Extra class on the wrapper. Callers own the card's footprint (width, grid placement). */
  className?: string;
}

/**
 * Parallax cover card: a 16:9 cover image scaled past its frame for parallax travel,
 * under a darkening overlay carrying the title, all wrapped in a single whole-card link.
 *
 * Everything size-related stays with the caller via `className` and `sizes`; this
 * component owns structure and the overlay treatment.
 */
export function CoverCard({
  href,
  title,
  imageUrl,
  width,
  height,
  sizes,
  imageAlt = '',
  children,
  className,
}: CoverCardProps) {
  const parallaxRef = useParallax({ enableParallax: true });
  const wrapperClass = [styles.cardWrapper, className].filter(Boolean).join(' ');

  return (
    <div ref={parallaxRef} className={wrapperClass}>
      <Link href={href} className={styles.card}>
        <div className={styles.imageWrapper}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              width={width ?? 400}
              height={height ?? 225}
              sizes={sizes}
              className={`${styles.cardImage} parallax-bg`}
            />
          ) : (
            <div className={`${styles.placeholder} parallax-bg`} />
          )}
        </div>
        <div className={styles.overlay}>
          <span className={styles.title}>{title}</span>
        </div>
      </Link>
      {children}
    </div>
  );
}

export default CoverCard;
