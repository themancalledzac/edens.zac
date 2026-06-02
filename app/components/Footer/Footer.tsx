import { NavLink } from '@/app/components/ui/NavLink/NavLink';

import styles from './Footer.module.scss';

/**
 * Persistent site footer, rendered site-wide from the root layout. Gives every
 * page — including deep-linked taxonomy pages and shared fullscreen URLs — a
 * crawlable way back into the site without discovering the hamburger menu.
 *
 * Internal routes use NavLink (a real next/link <a>). Only verified public
 * routes are linked: Home (/) and Explore (/explore). About/Contact live as
 * panels inside the MenuDropdown, not as standalone routes, so they are not
 * linked here. Socials are real external anchors with rel="noopener noreferrer".
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label="Footer">
        <NavLink href="/" className={styles.link}>
          Home
        </NavLink>
        <NavLink href="/explore" className={styles.link}>
          Explore
        </NavLink>
        <a
          href="https://instagram.com/themancalledzac"
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
        <a
          href="https://github.com/themancalledzac"
          className={styles.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </nav>
      <p className={styles.copyright}>© {new Date().getFullYear()} Zac Edens</p>
    </footer>
  );
}

export default Footer;
