import { act, renderHook } from '@testing-library/react';

import { useMessageDelete } from '@/app/hooks/useMessageDelete';
import type { AdminMessageView } from '@/app/lib/api/messages';
import * as messagesApi from '@/app/lib/api/messages';

jest.mock('@/app/lib/api/messages');

const mockDelete = messagesApi.deleteAdminMessage as jest.MockedFunction<
  typeof messagesApi.deleteAdminMessage
>;

const msg: AdminMessageView = {
  id: 1,
  email: 'alice@example.com',
  message: 'hello',
  createdAt: new Date().toISOString(),
};

function setup(initial: AdminMessageView[] = [msg], initialTotal = 1) {
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
  const hook = renderHook(() => useMessageDelete(messages, setMessages, setTotal));
  return { hook, setMessages, setTotal, get: () => ({ messages, total }) };
}

describe('useMessageDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  it('does nothing when the confirm dialog is cancelled', async () => {
    window.confirm = jest.fn(() => false);
    const { hook, setMessages } = setup();
    await act(async () => {
      await hook.result.current.handleDelete(msg);
    });
    expect(setMessages).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('optimistically removes the message and decrements the total', async () => {
    mockDelete.mockResolvedValue();
    const { hook, get } = setup();
    await act(async () => {
      await hook.result.current.handleDelete(msg);
    });
    expect(mockDelete).toHaveBeenCalledWith(1);
    expect(get().messages).toHaveLength(0);
    expect(get().total).toBe(0);
  });

  it('rolls back the list and total, and sets an error, when delete fails', async () => {
    mockDelete.mockRejectedValue(new Error('boom'));
    const { hook, get } = setup();
    await act(async () => {
      await hook.result.current.handleDelete(msg);
    });
    expect(get().messages).toHaveLength(1);
    expect(get().total).toBe(1);
    expect(hook.result.current.error).toMatch(/failed to delete/i);
  });
});
