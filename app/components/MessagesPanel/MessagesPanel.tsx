'use client';

import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

import { ListDetailSheet } from '@/app/components/ListPanel/ListDetailSheet';
import {
  ListPanel,
  type ListPanelShell,
  ListRow,
  ListRows,
  ViewAllLink,
} from '@/app/components/ListPanel/ListPanel';
import { PanelBody } from '@/app/components/ListPanel/PanelBody';
import { MessageRow } from '@/app/components/Messages/MessageRow';
import { type AdminMessagesPayload, useCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import { useMessageRead } from '@/app/hooks/useMessageRead';
import { type AdminMessageView, getAdminMessages } from '@/app/lib/api/messages';
import { relative, truncateWords } from '@/app/utils/messageFormat';
import { sortByDate } from '@/app/utils/sortByDate';

import styles from './MessagesPanel.module.scss';

interface MessagesPanelProps {
  /** The hub's tab strip and collapse state; absent when mounted on its own. */
  shell?: ListPanelShell;
}

/**
 * Branch predicates for {@link MessagesPanel}, held on an object so a test can replace one.
 */
export const messagesPanelGuards = {
  marksReadOnOpen(): boolean {
    return false;
  },
};

const EMPTY_PAYLOAD: AdminMessagesPayload = { messages: [], total: 0 };

async function fetchMessages(): Promise<AdminMessagesPayload> {
  const result = await getAdminMessages(100, 0);
  if (!result) return EMPTY_PAYLOAD;
  return { messages: sortByDate(result.messages, 'desc'), total: result.total };
}

/**
 * Self-fetching admin panel that lists messages newest-first in a compact column.
 *
 * The Messages tab of the `/admin` hub's list panel. The tab strip and collapsed state arrive as
 * `shell` and pass straight through to {@link ListPanel}: unlike the users panel this one has no
 * body-only modes to force the panel open for.
 *
 * `getAdminMessages` resolves `null` only for an empty (204) body — any non-OK response throws
 * `ApiError` out of `fetchAdminGetApi`. `useCachedPanelData` turns a throw with nothing cached
 * into the failed branch below, and never renders "No comments yet." over a backend that is
 * simply down. With a cached list showing, a failed background revalidation keeps it showing and
 * raises `revalidationFailed`, which the stale notice above the list reports — messages
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
 * Each row is one line and the only control in it; tapping it opens a {@link ListDetailSheet}
 * holding the {@link MessageRow} card with the full message, Reply in Gmail, the read toggle and
 * Delete. Opening the sheet never marks the message read: it stays unread until the admin taps
 * Mark read. {@link messagesPanelGuards} holds that decision so a test can flip it.
 */
export function MessagesPanel({ shell }: MessagesPanelProps) {
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

  const [openId, setOpenId] = useState<number | null>(null);
  const {
    togglingId,
    error: readError,
    handleToggleRead,
  } = useMessageRead(messages, setMessages, setTotal);
  const opened = messages.find(m => m.id === openId) ?? null;

  const openMessage = (m: AdminMessageView) => {
    setOpenId(m.id);
    if (m.readAt === null && messagesPanelGuards.marksReadOnOpen()) void handleToggleRead(m);
  };

  const action = <ViewAllLink href="/comments" count={total} />;
  const actionError = error ?? readError;

  return (
    <ListPanel {...shell} title="Messages" ariaLabel="Comments" action={action}>
      <PanelBody
        loading={loading}
        loadError={loadError}
        revalidationFailed={revalidationFailed}
        onRetry={() => void refresh()}
        loadingLabel="Loading…"
        isEmpty={messages.length === 0}
        emptyLabel="No comments yet."
      >
        <ListRows>
          {messages.map(m => (
            <ListRow
              key={m.id}
              primary={m.email}
              secondary={truncateWords(m.message, 10)}
              fact={relative(m.createdAt)}
              emphasis={m.readAt === null}
              onActivate={() => openMessage(m)}
              ariaLabel={`Open message from ${m.email}`}
            />
          ))}
        </ListRows>
        {actionError && <p className={styles.error}>{actionError}</p>}
      </PanelBody>
      <ListDetailSheet open={opened !== null} onClose={() => setOpenId(null)} title="Message">
        {opened && (
          <MessageRow
            message={opened}
            fullBody
            onDelete={handleDelete}
            deleting={deletingId === opened.id}
            onToggleRead={handleToggleRead}
            togglingRead={togglingId === opened.id}
          />
        )}
      </ListDetailSheet>
    </ListPanel>
  );
}
