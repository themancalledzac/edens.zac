import { useId } from 'react';

import { NavLink } from '@/app/components/ui/NavLink/NavLink';

import styles from './AdminCard.module.scss';

interface AdminDestination {
  href: string;
  label: string;
}

/**
 * The hub first, then the admin surfaces that live outside it. All-collections / all-images /
 * client-galleries are deliberately absent — they are tiles ON the hub, so listing them here
 * would just duplicate the page this card's first link goes to.
 */
const DESTINATIONS: readonly AdminDestination[] = [
  { href: '/admin', label: 'Admin hub' },
  { href: '/collection/manage', label: 'New collection' },
  { href: '/metadata', label: 'Metadata' },
  { href: '/comments', label: 'Comments' },
  { href: '/admin/roles', label: 'Roles' },
];

/**
 * Admin entry point on the signed-in user's own space, rendered only for an admin principal.
 *
 * This is the site's only navigation into `/admin`. The hub used to be reachable solely because
 * localhost redirected `/` to it; that redirect is gone, and `MenuDropdown` links to
 * `/admin/roles` but never to the hub itself, so without this card `/admin` is reachable only by
 * typing the URL.
 *
 * Gating is the caller's job and must be the real `principal.isAdmin` — never an environment
 * check. This card renders on production too; that is the point.
 */
export function AdminCard() {
  const headingId = useId();

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>
        Admin
      </h2>
      <div className={styles.body}>
        <p className={styles.hint}>Manage collections, metadata, messages and access.</p>
        <ul className={styles.links}>
          {DESTINATIONS.map(({ href, label }) => (
            <li key={href}>
              <NavLink href={href}>{label}</NavLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default AdminCard;
