'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';

import styles from './SiteHeader.module.scss';

interface SiteHeaderProps {
  /** True on a single collection's page; forwarded to {@link MenuDropdown} to gate Update. */
  isCollectionPage?: boolean;
  collectionSlug?: string;
}

/**
 * Site Header
 *
 * Shared navigation header with site title and hamburger menu toggle.
 *
 * The toggle's accessible name tracks what the next activation will do, so it never announces
 * "Open navigation menu" while the menu is already open. `aria-controls` is emitted only while
 * the overlay is mounted — pointing it at an id that is not in the document would be an invalid
 * ARIA reference.
 */
export function SiteHeader({ isCollectionPage = false, collectionSlug }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.navBarWrapper}>
          <div className={styles.navBarLeftWrapper}>
            <Link href="/" className={styles.title}>
              <span>Zac Edens</span>
            </Link>
          </div>
          <div className={styles.menuWrapper}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={toggleMenu}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
            >
              <AlignJustify className={styles.menu} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MenuDropdown
        id={menuId}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        isCollectionPage={isCollectionPage}
        collectionSlug={collectionSlug}
      />
    </>
  );
}

export default SiteHeader;
