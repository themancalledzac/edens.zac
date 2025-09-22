'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { MenuDropdown } from './MenuDropdown';
import styles from './site-header.module.scss';

/**
 * Shared site header for App Router pages.
 * Client Component with minimal state for menu dropdown.
 */
export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.navBarWrapper}>
          <div className={styles.navBarLeftWrapper}>
            <Link href="/" className={styles.title}>
              <h2>Zac Edens</h2>
            </Link>
          </div>
          <div className={styles.menuWrapper}>
            <AlignJustify
              className={styles.menu}
              onClick={toggleMenu}
            />
          </div>
        </div>
      </header>

      <MenuDropdown
        isOpen={isMenuOpen}
        onClose={closeMenu}
      />
    </>
  );
}

export default SiteHeader;
