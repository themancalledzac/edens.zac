'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { Button } from '@/app/components/ui/Button/Button';
import {
  type AdminMessageView,
  deleteAdminMessage,
  getAdminMessages,
} from '@/app/lib/api/messages';
import { gmailReplyUrl, relative, truncateWords } from '@/app/utils/messageFormat';

import styles from './MessagesPanel.module.scss';

/** Self-fetching admin panel that lists messages newest-first in a compact column. */
export function MessagesPanel() {
  const [messages, setMessages] = useState<AdminMessageView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async (m: AdminMessageView) => {
    if (!window.confirm(`Delete message from ${m.email}?`)) return;
    setError(null);
    setDeletingId(m.id);
    const previous = messages;
    setMessages(prev => prev.filter(x => x.id !== m.id));
    setTotal(t => Math.max(0, t - 1));
    try {
      await deleteAdminMessage(m.id);
    } catch {
      setMessages(previous);
      setTotal(t => t + 1);
      setError(`Failed to delete message from ${m.email}`);
    } finally {
      setDeletingId(null);
    }
  };

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
              <div className={styles.meta}>
                <a href={`mailto:${m.email}`} className={styles.email}>
                  {m.email}
                </a>
                <time className={styles.time} dateTime={m.createdAt} title={m.createdAt}>
                  {relative(m.createdAt)}
                </time>
              </div>
              <p className={styles.excerpt} title={m.message}>
                {truncateWords(m.message, 10)}
              </p>
              <div className={styles.actions}>
                <a
                  href={gmailReplyUrl(m.email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.replyLink}
                >
                  Reply in Gmail
                </a>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m.id}
                >
                  {deletingId === m.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
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
