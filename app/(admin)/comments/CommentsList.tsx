'use client';

import { useEffect, useRef, useState } from 'react';

import { MessageRow } from '@/app/components/messages/MessageRow';
import { Button } from '@/app/components/ui/Button/Button';
import { Input } from '@/app/components/ui/Field/Input';
import { Select } from '@/app/components/ui/Field/Select';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { useMessageRead } from '@/app/hooks/useMessageRead';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';

import styles from './Comments.module.scss';

interface Props {
  initialMessages: AdminMessageView[];
  initialTotal: number;
}

const PAGE = 50;

/**
 * How long typing settles before it becomes a request. Every keystroke now reaches the backend
 * rather than a local array, so this is what keeps a typed word to one query instead of five.
 */
const SEARCH_DEBOUNCE_MS = 300;

type ReadFilter = 'all' | 'unread' | 'read';

/**
 * The read filter as the API expresses it: omitted for both states, `true` for unread only,
 * `false` for read only.
 */
function unreadParam(filter: ReadFilter): boolean | undefined {
  if (filter === 'unread') return true;
  if (filter === 'read') return false;
  return undefined;
}

/**
 * The messages admin list: server-side search and read filtering, mark read/unread, delete, paging.
 *
 * Search and the read filter both narrow the whole table rather than the loaded page — the backend
 * takes `q` and `unread`, and returns a `total` counting the same filtered set. That is the
 * difference from the first version of this list, which filtered the array it had already loaded
 * and had to say so in a scope line; the scope line is gone because the count is now exhaustive.
 *
 * Changing either control refetches from offset 0. Responses are matched against a request counter
 * and a stale one is dropped, so a slow early keystroke cannot land on top of a later result.
 */
export function CommentsList({ initialMessages, initialTotal }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');

  const activeQuery = debouncedQuery.trim();
  const activeUnread = unreadParam(readFilter);
  const filtering = activeQuery.length > 0 || activeUnread !== undefined;

  const {
    deletingId,
    error: deleteError,
    handleDelete,
  } = useMessageDelete(messages, setMessages, setTotal);
  const {
    togglingId,
    error: readError,
    handleToggleRead,
  } = useMessageRead(messages, setMessages, setTotal, activeUnread);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * The request whose result may still be committed. Bumped when a new filter fetch starts, so a
   * response resolving after it has been superseded is dropped instead of overwriting the list.
   */
  const requestRef = useRef(0);

  /**
   * The filter the list on screen was loaded for. The server already fetched the unfiltered first
   * page, so the effect below has to skip that state rather than refetch it — and it must skip it
   * every time it runs, not once. A one-shot flag would be spent by StrictMode's first pass and
   * let the second pass fire a real request; comparing the filter instead is idempotent.
   */
  const filterKey = `${activeQuery}|${String(activeUnread)}`;
  const loadedFilterRef = useRef(filterKey);

  useEffect(() => {
    if (loadedFilterRef.current === filterKey) return;
    loadedFilterRef.current = filterKey;
    const request = (requestRef.current += 1);
    setRefreshing(true);
    setFetchError(null);
    getAdminMessages(PAGE, 0, { q: activeQuery, unread: activeUnread })
      .then(next => {
        if (request !== requestRef.current) return;
        setMessages(next?.messages ?? []);
        setTotal(next?.total ?? 0);
      })
      .catch(() => {
        if (request === requestRef.current) setFetchError('Failed to load messages');
      })
      .finally(() => {
        if (request === requestRef.current) setRefreshing(false);
      });
  }, [filterKey, activeQuery, activeUnread]);

  const loadMore = async () => {
    setLoading(true);
    const next = await getAdminMessages(PAGE, messages.length, {
      q: activeQuery,
      unread: activeUnread,
    });
    if (next?.messages?.length) setMessages(previous => [...previous, ...next.messages]);
    setLoading(false);
  };

  if (total === 0 && !filtering) {
    return <EmptyState align="page">No comments yet.</EmptyState>;
  }

  const unloaded = total - messages.length;
  const error = fetchError ?? deleteError ?? readError;

  return (
    <>
      <div className={styles.searchRow}>
        <div className={styles.controls}>
          <Input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search email or message"
            aria-label="Search messages"
            className={styles.search}
          />
          <Select
            value={readFilter}
            onChange={e => setReadFilter(e.target.value as ReadFilter)}
            aria-label="Filter by read state"
            className={styles.readFilter}
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </Select>
        </div>
        {filtering && (
          <p className={styles.searchScope} role="status">
            {refreshing ? 'Searching…' : `${total} matching`}
          </p>
        )}
      </div>
      {messages.length === 0 && !refreshing ? (
        <EmptyState align="page">
          {activeQuery ? `No messages match “${activeQuery}”.` : 'No messages match that filter.'}
        </EmptyState>
      ) : (
        <ul className={styles.list}>
          {messages.map(m => (
            <li key={m.id} className={m.readAt === null ? styles.rowUnread : styles.row}>
              <MessageRow
                message={m}
                onDelete={handleDelete}
                deleting={deletingId === m.id}
                onToggleRead={handleToggleRead}
                togglingRead={togglingId === m.id}
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
