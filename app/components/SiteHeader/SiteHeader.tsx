'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import { MenuDropdown } from '@/app/components/MenuDropdown/MenuDropdown';
import { useSiteMenu } from '@/app/components/SiteHeader/SiteMenuContext';
import { type MeResponse } from '@/app/types/Auth';

import styles from './SiteHeader.module.scss';

interface SiteHeaderProps {
  /** True on a single collection's page; forwarded to {@link MenuDropdown} to gate Update. */
  isCollectionPage?: boolean;
  collectionSlug?: string;
  /** Forwarded unchanged to {@link MenuDropdown}: undefined = unresolved, null = anonymous. */
  me?: MeResponse | null;
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
 *
 * Menu state comes from {@link SiteMenuProvider} when one wraps the header, so the mobile bottom
 * bar shares it; without a provider the header keeps its own state.
 */
export function SiteHeader({ isCollectionPage = false, collectionSlug, me }: SiteHeaderProps) {
  const shared = useSiteMenu();
  const [localOpen, setLocalOpen] = useState(false);
  const localId = useId();

  const isMenuOpen = shared ? shared.isOpen : localOpen;
  const menuId = shared ? shared.menuId : localId;
  const toggleMenu = shared ? shared.toggle : () => setLocalOpen(!localOpen);
  const closeMenu = shared ? shared.close : () => setLocalOpen(false);

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
        me={me}
      />
    </>
  );
}

export default SiteHeader;
