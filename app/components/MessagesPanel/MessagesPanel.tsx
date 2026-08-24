'use client';

import { type Dispatch, type ReactNode, type SetStateAction, useCallback } from 'react';

import { ListPanel, ListRow, ListRows, ViewAllLink } from '@/app/components/ListPanel/ListPanel';
import { MessageRowLeft, MessageRowRight } from '@/app/components/messages/MessageRow';
import { EmptyState } from '@/app/components/ui/StatusText/EmptyState';
import { LoadError } from '@/app/components/ui/StatusText/LoadError';
import { LoadingText } from '@/app/components/ui/StatusText/LoadingText';
import { StaleNotice } from '@/app/components/ui/StatusText/StaleNotice';
import { type AdminMessagesPayload, useCachedPanelData } from '@/app/hooks/useCachedPanelData';
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
 * {@link ListPanel}. Unlike the users panel this one has no body-only modes to guard, so it
 * simply forwards both props.
 *
 * `getAdminMessages` resolves `null` only for an empty (204) body — any non-OK response throws
 * `ApiError` out of `fetchAdminGetApi`. `useCachedPanelData` turns a throw with nothing cached
 * into the failed branch below, and never renders "No comments yet." over a backend that is
 * simply down. With a cached list showing, a failed background revalidation keeps it showing and
 * raises `revalidationFailed`, which the {@link StaleNotice} above the list reports — messages
 * served from a dead backend are never presented as current.
 *
 * The failure branch offers Retry rather than telling the admin to reload the page, matching
 * {@link UserManagementPanel}: both panels sit side by side on the `/admin` hub, and one of them
 * asking for a full page reload to recover from the same transient backend blip is a difference
 * with no reason behind it. `refresh` is shaped for that — with no data showing it clears the
 * previous error and re-enters loading, so a retry is indistinguishable from the first attempt.
 *
 * The delete flow's setters wrap the cache hook's write-through `setData`, keeping
 * {@link useMessageDelete}'s optimistic-update contract while making sure a deleted message
 * cannot resurrect from stale cache on the next remount.
 *
 * The {@link LoadingText} region renders outside the body branch on purpose; see its docblock. The
 * branch below therefore resolves to nothing at all while the read is in flight.
 */
const EMPTY_PAYLOAD: AdminMessagesPayload = { messages: [], total: 0 };

async function fetchMessages(): Promise<AdminMessagesPayload> {
  const result = await getAdminMessages(100, 0);
  if (!result) return EMPTY_PAYLOAD;
  const sorted = [...result.messages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return { messages: sorted, total: result.total };
}

export function MessagesPanel({ collapsed, onCollapsedChange }: MessagesPanelProps) {
  const { data, loading, loadError, revalidationFailed, refresh, setData } = useCachedPanelData(
    'messages',
    fetchMessages,
    'Could not load messages. Retry, or check that the backend is running.'
  );
  const messages = data?.messages ?? EMPTY_PAYLOAD.messages;
  const total = data?.total ?? 0;

  const setMessages = useCallback<Dispatch<SetStateAction<AdminMessageView[]>>>(
    action =>
      setData(previous => {
        const base = previous ?? EMPTY_PAYLOAD;
        return {
          ...base,
          messages: typeof action === 'function' ? action(base.messages) : action,
        };
      }),
    [setData]
  );
  const setTotal = useCallback<Dispatch<SetStateAction<number>>>(
    action =>
      setData(previous => {
        const base = previous ?? EMPTY_PAYLOAD;
        return { ...base, total: typeof action === 'function' ? action(base.total) : action };
      }),
    [setData]
  );
  const { deletingId, error, handleDelete } = useMessageDelete(messages, setMessages, setTotal);

  const headerRight = <ViewAllLink href="/comments" count={total} />;

  let body: ReactNode = null;
  if (!loading) {
    if (loadError) {
      body = <LoadError message={loadError} onRetry={() => void refresh()} />;
    } else if (messages.length === 0) {
      body = <EmptyState>No comments yet.</EmptyState>;
    } else {
      body = (
        <>
          <ListRows>
            {messages.map(m => (
              <ListRow
                key={m.id}
                left={<MessageRowLeft message={m} styles={styles} excerptWords={10} />}
                right={
                  <MessageRowRight
                    message={m}
                    styles={styles}
                    onDelete={handleDelete}
                    deleting={deletingId === m.id}
                  />
                }
              />
            ))}
          </ListRows>
          {error && <p className={styles.error}>{error}</p>}
        </>
      );
    }
  }

  return (
    <ListPanel
      title="Messages"
      ariaLabel="Comments"
      headerRight={headerRight}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <LoadingText isLoading={loading}>Loading…</LoadingText>
      {!loading && !loadError && revalidationFailed && <StaleNotice />}
      {body}
    </ListPanel>
  );
}

export default MessagesPanel;
