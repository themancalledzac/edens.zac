import { Fragment } from 'react';

import { NavLink } from '@/app/components/ui/NavLink/NavLink';

import styles from './Breadcrumb.module.scss';

export interface BreadcrumbItem {
  label: string;
  /** Omit on the current (last) item — it renders as plain text. */
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Ordered "up to parent" trail of real links. Items with an href render as a
 * crawlable NavLink; the final (current) item renders as plain text with
 * aria-current="page", per WAI-ARIA breadcrumb practice. Separators are
 * token-driven and aria-hidden so they don't pollute the accessible name.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${item.href ?? 'current'}`}>
              <li className={styles.item}>
                {item.href && !isLast ? (
                  <NavLink href={item.href} className={styles.link}>
                    {item.label}
                  </NavLink>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
                )}
              </li>
              {!isLast && <li className={styles.separator} aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumb;
