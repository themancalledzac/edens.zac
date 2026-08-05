'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { MessageRow } from '@/app/components/messages/MessageRow';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './MessagesPanel.module.scss';

interface MessagesPanelProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * Self-fetching admin panel that lists messages newest-first in a compact column.
 *
 * Collapsed state is owned by `AdminPanelRenderer` (it sizes the box) and passed through to
 * {@link AdminPanel}. Unlike the users panel this one has no body-only modes to guard, so it
 * simply forwards both props.
 */
export function MessagesPanel({ collapsed, onCollapsedChange }: MessagesPanelProps) {
  const [messages, setMessages] = useState<AdminMessageView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { deletingId, error, handleDelete } = useMessageDelete(messages, setMessages, setTotal);

  useEffect(() => {
    void (async () => {
      const result = await getAdminMessages(100, 0);
      if (result) {
        const sorted = [...result.messages].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMessages(sorted);
        setTotal(result.total);
      }
      setLoading(false);
    })();
  }, []);

  const action = (
    <Link href="/comments" className={styles.viewAll}>
      {total} · View all
    </Link>
  );

  let body: ReactNode;
  if (loading) {
    body = <p className={styles.muted}>Loading…</p>;
  } else if (messages.length === 0) {
    body = <p className={styles.muted}>No comments yet.</p>;
  } else {
    body = (
      <>
        <ul className={styles.list}>
          {messages.map(m => (
            <li key={m.id} className={styles.row}>
              <MessageRow
                message={m}
                onDelete={handleDelete}
                deleting={deletingId === m.id}
                styles={styles}
                excerptWords={10}
              />
            </li>
          ))}
        </ul>
        {error && <p className={styles.error}>{error}</p>}
      </>
    );
  }

  return (
    <AdminPanel
      title="Messages"
      ariaLabel="Comments"
      action={action}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      {body}
    </AdminPanel>
  );
}

export default MessagesPanel;
