'use client';

import Link, { type LinkProps } from 'next/link';
import { type AnchorHTMLAttributes, forwardRef, type ReactNode } from 'react';

import styles from './Tile.module.scss';

export interface TileProps
  extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  /** Accessible name for the tile (the visible title is inside an overlay). */
  'aria-label': string;
  children: ReactNode;
  className?: string;
}

/**
 * Image-tile navigation primitive. Always a real next/link <a> so tiles are
 * crawlable, middle-clickable, open-in-new-tab, and keyboard-activatable.
 * Composes the parallax image + title overlay + badge as children. `onClick`
 * is reserved for genuine non-nav actions (fullscreen-open); navigation is the
 * <a href>, so middle-click / cmd-click keep working.
 */
export const Tile = forwardRef<HTMLAnchorElement, TileProps>(function Tile(
  { children, className, ...rest },
  ref
) {
  const classes = [styles.tile, className].filter(Boolean).join(' ');
  return (
    <Link ref={ref} className={classes} {...rest}>
      {children}
    </Link>
  );
});
