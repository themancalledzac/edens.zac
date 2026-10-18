'use client';

import { AlignJustify } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSiteMenu } from '@/app/components/SiteHeader/SiteMenuContext';
import { useFetchMe } from '@/app/hooks/useFetchMe';
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
 * Mobile-only fixed bar with Menu, Explore, Collections and a fourth Log in / Your space cell.
 * The Menu cell drives the shared site menu from {@link SiteMenuProvider}. While `me` is
 * unresolved the fourth cell is reserved but empty, so a signed-in visitor never sees "Log in".
 * The bar is hidden at 768px and up in CSS.
 */
export function BottomNav({ me: initialMe }: BottomNavProps) {
  const pathname = usePathname();
  const menu = useSiteMenu();
  const { me, loading } = useFetchMe({ initialMe, enabled: true });

  const isOpen = menu?.isOpen ?? false;
  const closeMenu = menu?.close;

  const links = [
    { href: '/explore', label: 'Explore' },
    { href: '/collections', label: 'Collections' },
  ];
  if (!loading) {
    if (me) links.push({ href: me.isAdmin ? '/admin' : '/user', label: 'Your space' });
    else links.push({ href: '/login', label: 'Log in' });
  }

  return (
    <nav className={styles.bar} aria-label="Primary" data-bottom-nav>
      <button
        type="button"
        className={styles.cell}
        onClick={menu?.toggle}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menu?.menuId : undefined}
      >
        <AlignJustify className={styles.icon} aria-hidden="true" />
        <span>Menu</span>
      </button>
      {links.map(link => {
        const current = isCurrent(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={current ? `${styles.cell} ${styles.cellActive}` : styles.cell}
            aria-current={current ? 'page' : undefined}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        );
      })}
      {loading && <span className={styles.cell} aria-hidden="true" />}
    </nav>
  );
}

export default BottomNav;
