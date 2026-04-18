'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';

import styles from './SiteHeader.module.scss';

interface SiteHeaderProps {
  pageType?: 'default' | 'manage' | 'collection' | 'collectionsCollection';
  collectionSlug?: string;
}

/**
 * Site Header
 *
 * Shared navigation header with site title and hamburger menu toggle.
 */
export function SiteHeader({ pageType = 'default', collectionSlug }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
            >
              <AlignJustify className={styles.menu} />
            </button>
          </div>
        </div>
      </header>

      <MenuDropdown
        isOpen={isMenuOpen}
        onClose={closeMenu}
        pageType={pageType}
        collectionSlug={collectionSlug}
      />
    </>
  );
}

export default SiteHeader;
