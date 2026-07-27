'use client';

import { type ReactNode, useId, useRef, useState } from 'react';

import styles from './SectionTabs.module.scss';

/** One tab and the panel it reveals. */
export interface SectionTabDefinition {
  /** Stable key, also used to build the tab/panel element ids. */
  key: string;
  /** Tab label, e.g. "Collections". */
  label: string;
  /** Item count shown beside the label. */
  count: number;
  /** Line shown when the panel is selected but has no items. */
  emptyLabel: string;
  /** Panel body. Mounted lazily on first activation, then kept mounted. */
  content: ReactNode;
}

interface SectionTabsProps {
  tabs: SectionTabDefinition[];
  /** Key of the tab selected on first render; falls back to the first tab. */
  defaultTabKey?: string;
}

/**
 * Tabbed shell for the `/user` sections, replacing the previous stack of collapsible accordions.
 *
 * Only one panel is visible at a time, so the vertical space that used to separate four expanded
 * sections collapses to a single bar and the labels can be small — the sections read as one
 * consolidated surface rather than a long scroll.
 *
 * Follows the ARIA tabs pattern with manual activation: arrow keys move focus between tabs and
 * select as they go, Home/End jump to the ends. Panels mount lazily on first activation and stay
 * mounted afterwards, so switching away and back never refetches or resets a panel's state (the
 * behavior the accordion had, preserved).
 */
export function SectionTabs({ tabs, defaultTabKey }: SectionTabsProps) {
  const baseId = useId();
  const initialKey = tabs.some(t => t.key === defaultTabKey) ? defaultTabKey! : tabs[0]?.key;
  const [activeKey, setActiveKey] = useState<string | undefined>(initialKey);
  const [mountedKeys, setMountedKeys] = useState<Set<string>>(
    () => new Set(initialKey ? [initialKey] : [])
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (tabs.length === 0) return null;

  const select = (key: string) => {
    setActiveKey(key);
    setMountedKeys(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  };

  const focusTab = (key: string) => {
    select(key);
    tabRefs.current[key]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    focusTab(tabs[next]!.key);
  };

  const tabId = (key: string) => `${baseId}-tab-${key}`;
  const panelId = (key: string) => `${baseId}-panel-${key}`;

  return (
    <div className={styles.tabs}>
      <div className={styles.tabList} role="tablist" aria-label="Your space">
        {tabs.map((tab, index) => {
          const selected = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              ref={node => {
                tabRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={selected}
              aria-controls={panelId(tab.key)}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
              onClick={() => select(tab.key)}
              onKeyDown={event => onKeyDown(event, index)}
            >
              {tab.label}
              <span className={styles.count}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {tabs.map(tab => {
        const selected = tab.key === activeKey;
        return (
          <div
            key={tab.key}
            id={panelId(tab.key)}
            role="tabpanel"
            aria-labelledby={tabId(tab.key)}
            tabIndex={0}
            hidden={!selected}
            className={styles.panel}
          >
            {mountedKeys.has(tab.key) &&
              (tab.count === 0 ? <p className={styles.empty}>{tab.emptyLabel}</p> : tab.content)}
          </div>
        );
      })}
    </div>
  );
}
