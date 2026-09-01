'use client';

import { useMemo, useState } from 'react';

import { MessageRow } from '@/app/components/messages/MessageRow';
import { Button } from '@/app/components/ui/Button/Button';
import { Input } from '@/app/components/ui/Field/Input';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';

interface Props {
  initialMessages: AdminMessageView[];
  initialTotal: number;
}

const PAGE = 50;

/** Case-insensitive substring match over the two fields a message actually carries text in. */
function matchesQuery(message: AdminMessageView, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    message.email.toLowerCase().includes(needle) || message.message.toLowerCase().includes(needle)
  );
}

/**
 * The messages admin list: search, delete, and paging.
 *
 * Search filters the messages already loaded, not the whole table — the backend's
 * `GET /api/admin/messages` takes only `limit` and `offset`, with no query parameter. That
 * distinction is surfaced rather than hidden: while a search is active and unloaded messages
 * remain, the count line says how many were searched and Load more stays available. A box that
 * appeared to search everything while seeing only the first 50 would be a correctness bug, not a
 * rough edge.
 *
 * Deletion still operates on the full loaded list, so removing a message found by search updates
 * the same array the filter reads from.
 */
export function CommentsList({ initialMessages, initialTotal }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const { deletingId, error, handleDelete } = useMessageDelete(messages, setMessages, setTotal);

  const visible = useMemo(() => messages.filter(m => matchesQuery(m, query)), [messages, query]);

  const loadMore = async () => {
    setLoading(true);
    const next = await getAdminMessages(PAGE, messages.length);
    if (next?.messages?.length) setMessages([...messages, ...next.messages]);
    setLoading(false);
  };

  if (messages.length === 0) {
    return <EmptyState align="page">No comments yet.</EmptyState>;
  }

  const searching = query.trim().length > 0;
  const unloaded = total - messages.length;

  return (
    <>
      <div className={styles.searchRow}>
        <Input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search email or message"
          aria-label="Search messages"
          className={styles.search}
        />
        {searching && (
          <p className={styles.searchScope} role="status">
            {visible.length} of {messages.length} loaded
            {unloaded > 0 ? ` · ${unloaded} not yet loaded` : ''}
          </p>
        )}
      </div>
      {visible.length === 0 ? (
        <EmptyState align="page">No messages match “{query.trim()}”.</EmptyState>
      ) : (
        <ul className={styles.list}>
          {visible.map(m => (
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
      )}
      {error && <p className={styles.error}>{error}</p>}
      {unloaded > 0 && (
        <Button variant="outline" onClick={loadMore} disabled={loading} className={styles.loadMore}>
          {loading ? 'Loading…' : `Load more (${unloaded} remaining)`}
        </Button>
      )}
    </>
  );
}
