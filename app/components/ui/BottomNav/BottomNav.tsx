'use client';

import { AlignJustify, Folders, Plane, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSiteMenu } from '@/app/components/SiteHeader/SiteMenuContext';
import { type MeResponse } from '@/app/types/Auth';

import styles from './BottomNav.module.scss';

interface BottomNavProps {
  /** Server-resolved principal: undefined = unresolved, null = anonymous. */
  me?: MeResponse | null;
}

function isCurrent(pathname: string | null, href: string) {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}

/**
 * Bottom Nav
 *
 * Mobile-only fixed bar of four equal icon cells: Explore, Collections, You, Menu. The Menu cell
 * drives the shared site menu from {@link SiteMenuProvider}. Renders from the server-resolved
 * `me` prop only and never requests `/me`: a value gives "Your space" (`/admin` for admins,
 * `/user` otherwise), `null` gives "Log in", and `undefined` (unresolved) reserves an empty You
 * cell, so a signed-in visitor never sees "Log in".
 * While the menu is open the Menu cell becomes a "Close menu" X and the bar stays usable under the
 * phone sheet; tapping a link cell navigates and closes the menu. The bar is hidden at 768px and up
 * in CSS.
 */
export function BottomNav({ me }: BottomNavProps) {
  const pathname = usePathname();
  const menu = useSiteMenu();

  const isOpen = menu?.isOpen ?? false;
  const closeMenu = menu?.close;

  const links = [
    { href: '/explore', label: 'Explore', Icon: Plane },
    { href: '/collections', label: 'Collections', Icon: Folders },
  ];
  if (me) links.push({ href: me.isAdmin ? '/admin' : '/user', label: 'Your space', Icon: User });
  else if (me === null) links.push({ href: '/login', label: 'Log in', Icon: User });

  return (
    <nav className={styles.bar} aria-label="Primary" data-bottom-nav>
      {links.map(({ href, label, Icon }) => {
        const current = isCurrent(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={current ? `${styles.cell} ${styles.cellActive}` : styles.cell}
            aria-label={label}
            aria-current={current ? 'page' : undefined}
            onClick={closeMenu}
          >
            <Icon className={styles.icon} aria-hidden="true" />
          </Link>
        );
      })}
      {me === undefined && <span className={styles.cell} aria-hidden="true" />}
      <button
        type="button"
        className={styles.cell}
        onClick={menu?.toggle}
        aria-label={isOpen ? 'Close menu' : 'Menu'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menu?.menuId : undefined}
      >
        {isOpen ? (
          <X className={styles.icon} aria-hidden="true" />
        ) : (
          <AlignJustify className={styles.icon} aria-hidden="true" />
        )}
      </button>
    </nav>
  );
}

export default BottomNav;
