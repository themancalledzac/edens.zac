import Link from 'next/link';

import styles from './BackLink.module.scss';

interface BackLinkProps {
  href: string;
  /** Destination name shown after the arrow (default 'Admin'). */
  label?: string;
}

/**
 * "← Admin" link rendered as the first element inside the skip target by both {@link PageShell}
 * and `CollectionPage`, so admin subpages opt in with one prop instead of four copies. The arrow
 * is decorative and hidden from assistive tech.
 */
export function BackLink({ href, label = 'Admin' }: BackLinkProps) {
  return (
    <Link href={href} className={styles.back}>
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}
