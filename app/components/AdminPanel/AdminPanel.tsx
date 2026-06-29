'use client';

import { type ReactNode } from 'react';

import styles from './AdminPanel.module.scss';

interface AdminPanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}

export function AdminPanel({ title, action, children, ariaLabel }: AdminPanelProps) {
  return (
    <section className={styles.panel} aria-label={ariaLabel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {action}
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

export default AdminPanel;
