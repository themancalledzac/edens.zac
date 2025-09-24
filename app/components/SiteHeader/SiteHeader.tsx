'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { MenuDropdown } from '../MenuDropdown/MenuDropdown';
import styles from './SiteHeader.module.scss';

/**
 * Site Header
 *
 * Shared navigation header component with responsive design and mobile
 * menu functionality. Displays site title/logo and hamburger menu toggle
 * for accessing navigation dropdown.
 *
 * @dependencies
 * - Lucide React AlignJustify icon for menu toggle
 * - Next.js Link for client-side navigation
 * - React useState for menu state management
 * - MenuDropdown component for navigation menu
 *
 * @returns Client component with site branding and navigation
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
            <Link href="/public" className={styles.title}>
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
