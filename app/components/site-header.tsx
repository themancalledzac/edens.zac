import Link from 'next/link';
import { AlignJustify } from 'lucide-react';
import styles from './site-header.module.scss';

/**
 * Shared site header for App Router pages.
 * Server Component (no client hooks) to minimize client JS.
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.navBarWrapper}>
        <div className={styles.navBarLeftWrapper}>
          <Link href="/" className={styles.title}>
            <h2>Zac Edens</h2>
          </Link>
        </div>
        <div className={styles.menuWrapper}>
          {/* TODO: Replace with actual dropdown component when App Router compatible */}
          <AlignJustify className={styles.menu} />
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
