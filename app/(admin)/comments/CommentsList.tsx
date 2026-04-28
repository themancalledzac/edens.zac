'use client';

import { useState } from 'react';

import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';

interface Props {
  initialMessages: AdminMessageView[];
  initialTotal: number;
}

const PAGE = 50;
const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return RTF.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RTF.format(hours, 'hour');
  const days = Math.round(hours / 24);
  return RTF.format(days, 'day');
}

export function CommentsList({ initialMessages, initialTotal }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [total] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const next = await getAdminMessages(PAGE, messages.length);
    if (next?.messages?.length) setMessages([...messages, ...next.messages]);
    setLoading(false);
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
          </li>
        ))}
      </ul>
      {messages.length < total && (
        <button onClick={loadMore} disabled={loading} className={styles.loadMore}>
          {loading ? 'Loading...' : `Load more (${total - messages.length} remaining)`}
        </button>
      )}
    </>
  );
}
