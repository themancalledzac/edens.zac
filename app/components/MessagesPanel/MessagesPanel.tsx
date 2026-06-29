'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { MessageRow } from '@/app/components/messages/MessageRow';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './MessagesPanel.module.scss';

/** Self-fetching admin panel that lists messages newest-first in a compact column. */
export function MessagesPanel() {
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
    <AdminPanel title="Messages" ariaLabel="Comments" action={action}>
      {body}
    </AdminPanel>
  );
}

export default MessagesPanel;
