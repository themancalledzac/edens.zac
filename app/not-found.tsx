/**
 * Global 404 Not Found Page
 *
 * Default not found page component that renders when routes fail to resolve
 * or when notFound() is explicitly called. Provides user-friendly error
 * messaging and navigation back to the home page.
 *
 * @dependencies
 * - Next.js Link component for client-side navigation
 * - layout.module.scss for styling
 *
 * @returns Server component displaying 404 error with home link
 */
import Link from 'next/link';

import styles from './styles/layout.module.scss';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <h1>404 — Not Found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
