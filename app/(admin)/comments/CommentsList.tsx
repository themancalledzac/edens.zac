'use client';

import { useState } from 'react';

import { MessageRow } from '@/app/components/messages/MessageRow';
import { Button } from '@/app/components/ui/Button/Button';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';

interface Props {
  initialMessages: AdminMessageView[];
  initialTotal: number;
}

const PAGE = 50;

export function CommentsList({ initialMessages, initialTotal }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const { deletingId, error, handleDelete } = useMessageDelete(messages, setMessages, setTotal);

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
            <MessageRow
              message={m}
              onDelete={handleDelete}
              deleting={deletingId === m.id}
              styles={styles}
            />
          </li>
        ))}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
      {messages.length < total && (
        <Button variant="outline" onClick={loadMore} disabled={loading} className={styles.loadMore}>
          {loading ? 'Loading...' : `Load more (${total - messages.length} remaining)`}
        </Button>
      )}
    </>
  );
}
