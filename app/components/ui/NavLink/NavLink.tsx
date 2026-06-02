import Link, { type LinkProps } from 'next/link';
import { type AnchorHTMLAttributes, type ReactNode } from 'react';

import styles from './NavLink.module.scss';

export interface NavLinkProps
  extends LinkProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  children: ReactNode;
  className?: string;
}

/**
 * Canonical text navigation link. Always a real next/link <a> — crawlable,
 * middle-clickable, open-in-new-tab. Use for menu/footer/breadcrumb links;
 * use <Tile> for image-tile navigation.
 */
export function NavLink({ children, className, ...rest }: NavLinkProps) {
  const classes = [styles.navLink, className].filter(Boolean).join(' ');
  return (
    <Link className={classes} {...rest}>
      {children}
    </Link>
  );
}
