import Link from 'next/link';
import { type ReactElement } from 'react';

import styles from './UserTabs.module.scss';

/** One selectable section of `/user`, addressed by the `?tab=` search param. */
export interface UserTabDefinition {
  /** Stable key, also the `?tab=` value. */
  key: string;
  /** Tab label, e.g. "Collections". */
  label: string;
  /** Item count shown beside the label. */
  count: number;
}

interface UserTabsProps {
  tabs: readonly UserTabDefinition[];
  /** Key of the currently rendered tab. */
  activeKey: string;
}

/**
 * Section switcher for `/user`, driven entirely by the `?tab=` search param rather than client
 * state. Each tab is a plain link, so the page stays a Server Component, every section is
 * shareable and bookmarkable, and the browser's back button walks the sections — the reason this
 * replaced the previous client-side tab component (see the project rule preferring URL state over
 * React state/Context).
 *
 * Rendered as a `<nav>` of links rather than the ARIA tabs pattern: these navigate rather than
 * reveal already-present panels, so link semantics with `aria-current` describe them accurately
 * and keyboard support comes from the browser.
 */
export function UserTabs({ tabs, activeKey }: UserTabsProps): ReactElement {
  return (
    <nav className={styles.tabList} aria-label="Your space">
      {tabs.map(tab => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={`/user?tab=${tab.key}`}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={`${styles.tab} ${active ? styles.tabActive : ''}`}
          >
            {tab.label}
            <span className={styles.count}>{tab.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
