import { Card } from '@/app/components/ui/Card/Card';
import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';

import styles from './AdminCard.module.scss';

interface AdminDestination {
  href: string;
  label: string;
}

/**
 * The hub first, then the admin surfaces that live outside it. All-collections / all-images /
 * client-galleries / roles are deliberately absent — they are tiles or panels ON the hub, so
 * listing them here would just duplicate the page this card's first link goes to.
 */
const DESTINATIONS: readonly AdminDestination[] = [
  { href: '/admin', label: 'Admin hub' },
  { href: '/collection/manage', label: 'New collection' },
  { href: '/metadata', label: 'Metadata' },
  { href: '/comments', label: 'Comments' },
];

/**
 * Admin entry point on the signed-in user's own space, rendered only for an admin principal.
 *
 * One of the site's two navigations into `/admin`, alongside `MenuDropdown`'s admin link. The hub
 * used to be reachable solely because localhost redirected `/` to it; that redirect is gone, so
 * those two links are all that keep `/admin` from being reachable only by typing the URL.
 *
 * Gating is the caller's job and must be the real `principal.isAdmin` — never an environment
 * check. This card renders on production too; that is the point.
 *
 * The destinations are {@link FilterChip}s rather than bare text links so they read as the same
 * kind of affordance as the section chips directly below them in the rail. `scroll` is on: these
 * leave `/user` for a page the reader has not seen, so the browser must start them at the top.
 */
export function AdminCard() {
  return (
    <Card title="Admin">
      <ul className={styles.links}>
        {DESTINATIONS.map(({ href, label }) => (
          <li key={href}>
            <FilterChip href={href} label={label} scroll />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default AdminCard;
