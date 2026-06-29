import { type Dispatch, type SetStateAction, useState } from 'react';

import { type AdminMessageView, deleteAdminMessage } from '@/app/lib/api/messages';

/**
 * Shared optimistic-delete logic for admin message lists. Removes the message
 * locally first, then rolls the list (and total) back if the backend call fails.
 * Owns the transient `deletingId` / `error` UI state so callers don't duplicate it.
 */
export function useMessageDelete(
  messages: AdminMessageView[],
  setMessages: Dispatch<SetStateAction<AdminMessageView[]>>,
  setTotal: Dispatch<SetStateAction<number>>
) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return { deletingId, error, handleDelete };
}
