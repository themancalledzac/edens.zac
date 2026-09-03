import { type Dispatch, type SetStateAction, useState } from 'react';

import { type AdminMessageView, markMessageRead } from '@/app/lib/api/messages';

/**
 * Optimistic mark-read/unread for admin message lists, shaped like `useMessageDelete`: flip the
 * row locally, then restore the previous list and total if the backend call fails.
 *
 * `unreadFilter` is the list's active read filter, in the tri-state the API uses — `undefined`
 * shows both, `true` unread only, `false` read only. When it is set, a row whose new state no
 * longer matches is removed and the total decremented, because leaving a read message visible
 * under an "Unread" filter would misreport what the list is showing.
 */
export function useMessageRead(
  messages: AdminMessageView[],
  setMessages: Dispatch<SetStateAction<AdminMessageView[]>>,
  setTotal: Dispatch<SetStateAction<number>>,
  unreadFilter?: boolean
) {
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggleRead = async (m: AdminMessageView) => {
    const read = m.readAt === null;
    setError(null);
    setTogglingId(m.id);
    const previous = messages;
    const readAt = read ? new Date().toISOString() : null;
    const stillMatches = unreadFilter === undefined || unreadFilter === (readAt === null);

    setMessages(prev =>
      stillMatches
        ? prev.map(x => (x.id === m.id ? { ...x, readAt } : x))
        : prev.filter(x => x.id !== m.id)
    );
    if (!stillMatches) setTotal(t => Math.max(0, t - 1));

    try {
      await markMessageRead(m.id, read);
    } catch {
      setMessages(previous);
      if (!stillMatches) setTotal(t => t + 1);
      setError(`Failed to mark message from ${m.email} as ${read ? 'read' : 'unread'}`);
    } finally {
      setTogglingId(null);
    }
  };

  return { togglingId, error, handleToggleRead };
}
