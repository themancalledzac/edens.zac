'use client';

import { type ReactNode, useId, useState } from 'react';

import styles from './CollapsibleSection.module.scss';
import { SectionTitleCard } from './SectionTitleCard';

interface CollapsibleSectionProps {
  /** Section label shown on the title card. */
  label: string;
  /** Item count shown on the title card (also decides the empty state). */
  count: number;
  /** Whether the section starts expanded. */
  defaultOpen?: boolean;
  /** Line shown when the section is expanded but has no items. */
  emptyLabel?: string;
  /** The section body. Mounted lazily on first expand, then kept mounted. */
  children: ReactNode;
}

/**
 * Client accordion shell for a `/user` section: a {@link SectionTitleCard} button plus a body that
 * is mounted lazily on first expand and kept mounted thereafter (so re-collapsing does not refetch
 * or reset the body's state). Empty sections render a short "nothing here yet" line on expand.
 */
export function CollapsibleSection({
  label,
  count,
  defaultOpen = false,
  emptyLabel = 'Nothing here yet.',
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const bodyId = useId();

  const toggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next) setHasOpened(true);
      return next;
    });
  };

  return (
    <section className={styles.section}>
      <SectionTitleCard
        label={label}
        count={count}
        open={open}
        onToggle={toggle}
        controlsId={bodyId}
      />
      {/* The body container is always rendered so the title card's `aria-controls` target exists
          even before first expand; its contents still mount lazily (only once opened) and stay
          mounted thereafter. `hidden` hides it while collapsed. */}
      <div id={bodyId} className={styles.body} hidden={!open}>
        {hasOpened && (count === 0 ? <p className={styles.empty}>{emptyLabel}</p> : children)}
      </div>
    </section>
  );
}
