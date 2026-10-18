import { ApiError, fetchAdminDeleteApi, fetchAdminGetApi, fetchAdminPatchJsonApi } from './core';

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

export interface ContactPayload {
  email: string;
  message: string;
}

export type ContactResult =
  | { ok: true; id: number; createdAt: string }
  | { ok: false; code: 'rate-limit' | 'validation' | 'server' | 'network'; message: string };

const SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again in a bit.';
const NETWORK_ERROR_MESSAGE = "Couldn't reach the server. Please try again in a bit.";
const RATE_LIMIT_MESSAGE =
  'Whoa — too many messages from your network in the last hour. Please try again later.';

const CONTACT_ENDPOINT = '/api/proxy/api/public/messages';

/**
 * Submit the public contact form and fold every outcome into a `ContactResult`.
 *
 * Non-201 responses are raised as `ApiError` inside the try and mapped back to a result by status:
 * 429 is `rate-limit`, 400 is `validation` carrying the backend's message, anything else is
 * `server`. A 201 with a malformed body is `server`; a thrown fetch or an unparseable JSON body is
 * `network`.
 */
export async function submitContactMessage(payload: ContactPayload): Promise<ContactResult> {
  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 201) {
      const data = (await res.json()) as { id: number; createdAt: string };
      if (typeof data.id !== 'number' || typeof data.createdAt !== 'string') {
        return { ok: false, code: 'server', message: SERVER_ERROR_MESSAGE };
      }
      return { ok: true, id: data.id, createdAt: data.createdAt };
    }

    if (res.status === 400) {
      const data = (await res.json()) as { message?: string };
      throw new ApiError(data.message ?? 'Invalid submission.', 400);
    }

    throw new ApiError(res.status === 429 ? RATE_LIMIT_MESSAGE : SERVER_ERROR_MESSAGE, res.status);
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return { ok: false, code: 'rate-limit', message: error.message };
      }
      if (error.status === 400) {
        return { ok: false, code: 'validation', message: error.message };
      }
      return { ok: false, code: 'server', message: error.message };
    }
    return { ok: false, code: 'network', message: NETWORK_ERROR_MESSAGE };
  }
}
