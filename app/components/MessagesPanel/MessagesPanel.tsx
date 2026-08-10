'use client';

import Link from 'next/link';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';
import { MessageRow } from '@/app/components/messages/MessageRow';
import { Button } from '@/app/components/ui/Button/Button';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';
import { logger } from '@/app/utils/logger';

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
 *
 * `getAdminMessages` resolves `null` only for an empty (204) body — any non-OK response throws
 * `ApiError` out of `fetchAdminGetApi`. The load therefore needs a real `catch`: without one the
 * `finally` never runs and the panel sits on "Loading…" forever, and a swallowed throw would
 * render the "No comments yet." empty state over a backend that is simply down.
 *
 * The failure branch offers Retry rather than telling the admin to reload the page, matching
 * {@link UserManagementPanel}: both panels sit side by side on the `/admin` hub, and one of them
 * asking for a full page reload to recover from the same transient backend blip is a difference
 * with no reason behind it. `load` is shaped for that — it clears the previous error and re-enters
 * the loading state, so a retry is indistinguishable from the first attempt.
 *
 * The {@link LoadingText} region renders outside the body branch on purpose; see its docblock. The
 * branch below therefore resolves to nothing at all while the read is in flight.
 */
export function MessagesPanel({ collapsed, onCollapsedChange }: MessagesPanelProps) {
  const [messages, setMessages] = useState<AdminMessageView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { deletingId, error, handleDelete } = useMessageDelete(messages, setMessages, setTotal);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getAdminMessages(100, 0);
      if (result) {
        const sorted = [...result.messages].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMessages(sorted);
        setTotal(result.total);
      }
    } catch (error_) {
      logger.error('MessagesPanel', 'Failed to load admin messages', error_);
      setLoadError('Could not load messages. Retry, or check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const action = (
    <Link href="/comments" className={styles.viewAll}>
      {total} · View all
    </Link>
  );

  let body: ReactNode = null;
  if (!loading) {
    if (loadError) {
      body = (
        <div className={styles.loadError} role="alert">
          <p className={styles.error}>{loadError}</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      );
    } else if (messages.length === 0) {
      body = <EmptyState>No comments yet.</EmptyState>;
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
  }

  return (
    <AdminPanel
      title="Messages"
      ariaLabel="Comments"
      action={action}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading…</LoadingText>
      {body}
    </AdminPanel>
  );
}

export default MessagesPanel;
