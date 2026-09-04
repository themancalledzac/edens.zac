/**
 * Unit tests for the admin messages API module (B8 coverage gap — `messages.ts` had none).
 *
 * The module is a thin pair of wrappers over the admin channel helpers in core.ts, so these specs
 * assert the two things the wrappers actually decide: the endpoint string (including the query
 * defaults) and the cache directive. Error mapping belongs to core.ts and is covered in
 * tests/lib/api/core.test.ts, so here it is only checked that a rejection propagates rather than
 * being swallowed — four call sites depend on that, including the optimistic delete in
 * `useMessageDelete`, which rolls the row back on a throw.
 */

import {
  ApiError,
  fetchAdminDeleteApi,
  fetchAdminGetApi,
  fetchAdminPatchJsonApi,
} from '@/app/lib/api/core';
import {
  type AdminMessageList,
  deleteAdminMessage,
  getAdminMessages,
  markMessageRead,
} from '@/app/lib/api/messages';

// Keep ApiError real so the propagation specs assert on the real class.
jest.mock('@/app/lib/api/core', () => ({
  ...jest.requireActual('@/app/lib/api/core'),
  fetchAdminGetApi: jest.fn(),
  fetchAdminDeleteApi: jest.fn(),
  fetchAdminPatchJsonApi: jest.fn(),
}));

const getMock = fetchAdminGetApi as jest.Mock;
const deleteMock = fetchAdminDeleteApi as jest.Mock;
const patchMock = fetchAdminPatchJsonApi as jest.Mock;

const list: AdminMessageList = {
  messages: [
    {
      id: 1,
      email: 'someone@example.com',
      message: 'Nice photos',
      createdAt: '2026-01-01T00:00Z',
      readAt: null,
    },
  ],
  total: 1,
  limit: 50,
  offset: 0,
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('getAdminMessages', () => {
  it('GETs the messages page with no-store and returns the list', async () => {
    getMock.mockResolvedValueOnce(list);

    await expect(getAdminMessages(25, 50)).resolves.toEqual(list);
    expect(getMock).toHaveBeenCalledWith('/messages?limit=25&offset=50', { cache: 'no-store' });
  });

  it('defaults to the first page of 50 when called with no arguments', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages();

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0', { cache: 'no-store' });
  });

  it('keeps an explicit offset of 0 while overriding the limit', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(1);

    expect(getMock).toHaveBeenCalledWith('/messages?limit=1&offset=0', { cache: 'no-store' });
  });

  it('passes a null body (204) straight through as null', async () => {
    getMock.mockResolvedValueOnce(null);

    await expect(getAdminMessages()).resolves.toBeNull();
  });

  it('propagates an ApiError rather than degrading to null', async () => {
    getMock.mockRejectedValueOnce(new ApiError('Unauthorized', 401));

    await expect(getAdminMessages()).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });
});

describe('getAdminMessages — server-side filtering', () => {
  it('sends a trimmed query as ?q=', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { q: '  prints  ' });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0&q=prints', {
      cache: 'no-store',
    });
  });

  it('omits ?q= entirely for an empty or whitespace-only query', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { q: '   ' });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0', { cache: 'no-store' });
  });

  it('url-encodes a query rather than pasting it into the string raw', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { q: 'a&b=c d' });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0&q=a%26b%3Dc+d', {
      cache: 'no-store',
    });
  });

  it('sends ?unread=true for unread only', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { unread: true });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0&unread=true', {
      cache: 'no-store',
    });
  });

  it('sends ?unread=false for read only — false is a filter, not an absence', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { unread: false });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0&unread=false', {
      cache: 'no-store',
    });
  });

  it('omits unread when it is undefined, which is how "both states" is asked for', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(50, 0, { unread: undefined, q: 'x' });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=50&offset=0&q=x', { cache: 'no-store' });
  });

  it('sends both filters together', async () => {
    getMock.mockResolvedValueOnce(list);

    await getAdminMessages(20, 40, { q: 'prints', unread: true });

    expect(getMock).toHaveBeenCalledWith('/messages?limit=20&offset=40&unread=true&q=prints', {
      cache: 'no-store',
    });
  });
});

describe('markMessageRead', () => {
  it('PATCHes the read sub-resource with an explicit read flag', async () => {
    patchMock.mockResolvedValueOnce(null);

    await expect(markMessageRead(42, true)).resolves.toBeUndefined();
    expect(patchMock).toHaveBeenCalledWith('/messages/42/read', { read: true });
  });

  it('sends read:false to mark unread rather than omitting the body', async () => {
    patchMock.mockResolvedValueOnce(null);

    await markMessageRead(42, false);

    expect(patchMock).toHaveBeenCalledWith('/messages/42/read', { read: false });
  });

  it('propagates an ApiError so the optimistic flip can roll back', async () => {
    patchMock.mockRejectedValueOnce(new ApiError('Not Found', 404));

    await expect(markMessageRead(42, true)).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
    });
  });
});

describe('deleteAdminMessage', () => {
  it('DELETEs the message by id', async () => {
    deleteMock.mockResolvedValueOnce(null);

    await expect(deleteAdminMessage(42)).resolves.toBeUndefined();
    expect(deleteMock).toHaveBeenCalledWith('/messages/42');
  });

  it('resolves undefined even when the backend returns a body', async () => {
    deleteMock.mockResolvedValueOnce({ deleted: true });

    await expect(deleteAdminMessage(42)).resolves.toBeUndefined();
  });

  it('propagates an ApiError so the optimistic row removal can roll back', async () => {
    deleteMock.mockRejectedValueOnce(new ApiError('Not Found', 404));

    await expect(deleteAdminMessage(42)).rejects.toMatchObject({ name: 'ApiError', status: 404 });
  });
});
