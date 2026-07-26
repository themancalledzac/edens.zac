'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode } from 'react';

import { useParallax } from '@/app/hooks/useParallax';

import styles from './CoverCard.module.scss';

/**
 * Visual treatment. `default` is the token-clean showcase look. `compact` reproduces the
 * pre-extraction LocationCollections look byte for byte — see the `.compact` block in
 * CoverCard.module.scss for why those values are what they are.
 */
export type CoverCardVariant = 'default' | 'compact';

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
  /** Eager-load the cover. Set on above-the-fold cards only (LCP candidates). */
  priority?: boolean;
  /** Secondary overlay line under the title, e.g. a formatted date range. */
  subtitle?: string;
  /**
   * Cover `alt`. Defaults to `''` (decorative — the overlay title already names the link).
   * Pass a string only where the cover is meant to carry its own accessible name.
   */
  imageAlt?: string;
  /** Visual treatment; defaults to the token-clean showcase look. */
  variant?: CoverCardVariant;
  /** Rendered beside the link inside the positioned wrapper, e.g. a FollowButton. */
  children?: ReactNode;
  /** Extra class on the wrapper. Callers own the card's footprint (width, grid placement). */
  className?: string;
}

/**
 * Parallax cover card: a 16:9 cover image scaled past its frame for parallax travel,
 * under a darkening overlay carrying the title (and optional subtitle), all wrapped in a
 * single whole-card link.
 *
 * Shared by the public /collections showcase and the LocationCollections row, which had
 * been ~90% duplicates of each other. Everything size-related stays with the caller via
 * `className` and `sizes`; this component owns structure and the overlay treatment.
 */
export function CoverCard({
  href,
  title,
  imageUrl,
  width,
  height,
  sizes,
  priority = false,
  subtitle,
  imageAlt = '',
  variant = 'default',
  children,
  className,
}: CoverCardProps) {
  const parallaxRef = useParallax({ enableParallax: true });
  const wrapperClass = [styles.cardWrapper, variant === 'compact' && styles.compact, className]
    .filter(Boolean)
    .join(' ');

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
              priority={priority}
              className={`${styles.cardImage} parallax-bg`}
            />
          ) : (
            <div className={`${styles.placeholder} parallax-bg`} />
          )}
        </div>
        <div className={styles.overlay}>
          <span className={styles.title}>{title}</span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
        </div>
      </Link>
      {children}
    </div>
  );
}

export default CoverCard;
