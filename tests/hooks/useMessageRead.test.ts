/**
 * Unit tests for the optimistic mark-read/unread hook.
 *
 * Two behaviours carry the weight: the flip is applied locally before the request and undone if it
 * throws, and a row whose new state no longer matches the list's active read filter is removed
 * rather than left showing under a filter it contradicts.
 */

import { act, renderHook } from '@testing-library/react';

import { useMessageRead } from '@/app/hooks/useMessageRead';
import type { AdminMessageView } from '@/app/lib/api/messages';
import * as messagesApi from '@/app/lib/api/messages';

jest.mock('@/app/lib/api/messages');

const mockMarkRead = messagesApi.markMessageRead as jest.MockedFunction<
  typeof messagesApi.markMessageRead
>;

const unreadMsg: AdminMessageView = {
  id: 1,
  email: 'alice@example.com',
  message: 'hello',
  createdAt: '2026-01-01T00:00:00.000Z',
  readAt: null,
};

const readMsg: AdminMessageView = { ...unreadMsg, id: 2, readAt: '2026-01-02T00:00:00.000Z' };

function setup(initial: AdminMessageView[], initialTotal: number, unreadFilter?: boolean) {
  let messages = initial;
  let total = initialTotal;
  const setMessages = jest.fn(
    (updater: AdminMessageView[] | ((p: AdminMessageView[]) => AdminMessageView[])) => {
      messages = typeof updater === 'function' ? updater(messages) : updater;
    }
  );
  const setTotal = jest.fn((updater: number | ((p: number) => number)) => {
    total = typeof updater === 'function' ? updater(total) : updater;
  });
  const hook = renderHook(() => useMessageRead(messages, setMessages, setTotal, unreadFilter));
  return { hook, get: () => ({ messages, total }) };
}

describe('useMessageRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkRead.mockResolvedValue();
  });

  it('marks an unread message read and stamps a readAt', async () => {
    const { hook, get } = setup([unreadMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(mockMarkRead).toHaveBeenCalledWith(1, true);
    expect(get().messages[0]?.readAt).not.toBeNull();
  });

  it('marks a read message unread and clears its readAt', async () => {
    const { hook, get } = setup([readMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(readMsg);
    });

    expect(mockMarkRead).toHaveBeenCalledWith(2, false);
    expect(get().messages[0]?.readAt).toBeNull();
  });

  it('leaves the total alone when no read filter is active', async () => {
    const { hook, get } = setup([unreadMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(get().messages).toHaveLength(1);
    expect(get().total).toBe(1);
  });

  it('drops the row and decrements the total when it stops matching an Unread filter', async () => {
    const { hook, get } = setup([unreadMsg], 1, true);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(get().messages).toHaveLength(0);
    expect(get().total).toBe(0);
  });

  it('drops the row when it stops matching a Read filter', async () => {
    const { hook, get } = setup([readMsg], 1, false);

    await act(async () => {
      await hook.result.current.handleToggleRead(readMsg);
    });

    expect(get().messages).toHaveLength(0);
    expect(get().total).toBe(0);
  });

  it('keeps a row that still matches the active filter', async () => {
    const { hook, get } = setup([readMsg], 1, true);

    await act(async () => {
      await hook.result.current.handleToggleRead(readMsg);
    });

    expect(get().messages).toHaveLength(1);
    expect(get().messages[0]?.readAt).toBeNull();
    expect(get().total).toBe(1);
  });

  it('rolls the flip back and reports an error when the request fails', async () => {
    mockMarkRead.mockRejectedValue(new Error('boom'));
    const { hook, get } = setup([unreadMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(get().messages[0]?.readAt).toBeNull();
    expect(hook.result.current.error).toMatch(/failed to mark message .* as read/i);
  });

  it('restores both the dropped row and the total when a filtered flip fails', async () => {
    mockMarkRead.mockRejectedValue(new Error('boom'));
    const { hook, get } = setup([unreadMsg], 1, true);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(get().messages).toHaveLength(1);
    expect(get().total).toBe(1);
  });

  it('names the unread direction in its error message', async () => {
    mockMarkRead.mockRejectedValue(new Error('boom'));
    const { hook } = setup([readMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(readMsg);
    });

    expect(hook.result.current.error).toMatch(/as unread/i);
  });

  it('clears togglingId once the request settles', async () => {
    const { hook } = setup([unreadMsg], 1);

    await act(async () => {
      await hook.result.current.handleToggleRead(unreadMsg);
    });

    expect(hook.result.current.togglingId).toBeNull();
  });
});
