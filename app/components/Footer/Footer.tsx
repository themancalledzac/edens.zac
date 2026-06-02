import styles from './Footer.module.scss';

/**
 * Minimal site footer, rendered site-wide from the root layout: a copyright
 * line plus external social links. Intentionally NOT a navigation surface —
 * primary navigation lives in the SiteHeader.
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.nav} aria-label="Footer">
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
