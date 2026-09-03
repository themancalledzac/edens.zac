import { fetchAdminDeleteApi, fetchAdminGetApi, fetchAdminPatchJsonApi } from './core';

export interface AdminMessageView {
  id: number;
  email: string;
  message: string;
  createdAt: string;
  /** When the message was marked read; `null` while it is still unread. */
  readAt: string | null;
}

export interface AdminMessageList {
  messages: AdminMessageView[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Server-side narrowing for the admin message list.
 *
 * `unread` is tri-state on purpose and mirrors the backend: omitted returns both states, `true`
 * returns unread only, `false` returns read only. A boolean with a default could not express
 * "both", which is the list's normal case.
 */
export interface AdminMessageFilter {
  /** Case-insensitive substring of the sender address or the body. */
  q?: string;
  unread?: boolean;
}

/**
 * One page of messages, newest first, narrowed server-side.
 *
 * `total` counts the rows matching the SAME filter rather than the whole table, so a caller can
 * page through a filtered set without its own bookkeeping. An empty or whitespace-only `q` is
 * dropped rather than sent, so clearing the search box asks for the unfiltered list instead of
 * asking the backend to match the empty string.
 */
export async function getAdminMessages(
  limit = 50,
  offset = 0,
  filter: AdminMessageFilter = {}
): Promise<AdminMessageList | null> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filter.unread !== undefined) params.set('unread', String(filter.unread));
  const q = filter.q?.trim();
  if (q) params.set('q', q);
  return fetchAdminGetApi<AdminMessageList>(`/messages?${params.toString()}`, {
    cache: 'no-store',
  });
}

/**
 * Mark one message read or unread. Resolves on success and throws on any non-OK response, which
 * is the contract `useMessageRead`'s optimistic rollback is built on.
 */
export async function markMessageRead(id: number, read: boolean): Promise<void> {
  await fetchAdminPatchJsonApi<void>(`/messages/${id}/read`, { read });
}

export async function deleteAdminMessage(id: number): Promise<void> {
  await fetchAdminDeleteApi<void>(`/messages/${id}`);
}
