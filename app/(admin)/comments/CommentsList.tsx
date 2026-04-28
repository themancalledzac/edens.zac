'use client';

import { useState } from 'react';

import {
  type AdminMessageView,
  deleteAdminMessage,
  getAdminMessages,
} from '@/app/lib/api/messages';

import styles from './Comments.module.scss';

interface Props {
  initialMessages: AdminMessageView[];
  initialTotal: number;
}

const PAGE = 50;
const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relative(iso: string): string {
  const utc = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
  const diffMs = new Date(utc).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return RTF.format(days, 'day');
}

function gmailReplyUrl(email: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email,
    su: 'Re: your message',
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function CommentsList({ initialMessages, initialTotal }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMore = async () => {
    setLoading(true);
    const next = await getAdminMessages(PAGE, messages.length);
    if (next?.messages?.length) setMessages([...messages, ...next.messages]);
    setLoading(false);
  };

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

  if (messages.length === 0) {
    return <p className={styles.empty}>No comments yet.</p>;
  }

  return (
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
            <p className={styles.body}>{m.message}</p>
            <div className={styles.actions}>
              <a
                href={gmailReplyUrl(m.email)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.replyButton}
              >
                Reply in Gmail
              </a>
              <button
                type="button"
                onClick={() => handleDelete(m)}
                disabled={deletingId === m.id}
                className={styles.deleteButton}
              >
                {deletingId === m.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
      {messages.length < total && (
        <button onClick={loadMore} disabled={loading} className={styles.loadMore}>
          {loading ? 'Loading...' : `Load more (${total - messages.length} remaining)`}
        </button>
      )}
    </>
  );
}
