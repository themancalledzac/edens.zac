/** @jest-environment node */
jest.mock('@/app/lib/api/adminHome', () => ({
  getAdminHomeTiles: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/app/lib/api/users', () => ({ listUsers: jest.fn().mockResolvedValue([]) }));
jest.mock('@/app/lib/api/roles', () => ({ listRoles: jest.fn().mockResolvedValue([]) }));
jest.mock('@/app/lib/api/collections', () => ({
  getMetadata: jest.fn().mockResolvedValue({ collections: [] }),
}));
jest.mock('@/app/lib/api/messages', () => ({ getAdminMessages: jest.fn() }));

type MessagesFilter = { unread?: boolean };

/**
 * `loadAdminHub` as a fresh module with the messages read answering per call: the filtered call
 * (`unread: true`) gets `unread`, any other call gets `all`, and an `Error` stands in for a failed
 * read. With `guardOff`, `toUnreadCount` in `adminHubContent` is swapped for a version that lets
 * every result through, including a failed read and a zero.
 */
async function load(unread: number | Error, all: number, guardOff = false) {
  jest.resetModules();
  if (guardOff) {
    jest.doMock('@/app/(admin)/admin/adminHubContent', () => ({
      ...jest.requireActual('@/app/(admin)/admin/adminHubContent'),
      toUnreadCount: (result: { total: number } | null) => result?.total ?? 0,
    }));
  } else {
    jest.dontMock('@/app/(admin)/admin/adminHubContent');
  }
  const { getAdminMessages } = await import('@/app/lib/api/messages');
  const messages = getAdminMessages as jest.Mock;
  messages.mockImplementation((_limit: number, _offset: number, filter?: MessagesFilter) => {
    if (filter?.unread !== true) return Promise.resolve({ total: all, items: [] });
    return unread instanceof Error
      ? Promise.reject(unread)
      : Promise.resolve({ total: unread, items: [] });
  });
  const { loadAdminHub } = await import('@/app/(admin)/admin/loadAdminHub');
  return { loadAdminHub, messages };
}

describe('loadAdminHub — unread messages', () => {
  it('A7: returns the unread total as unreadMessages when it is above 0', async () => {
    const { loadAdminHub } = await load(3, 10);
    expect((await loadAdminHub(900)).unreadMessages).toBe(3);
  });

  it('A7: returns undefined when the unread total is 0', async () => {
    const { loadAdminHub } = await load(0, 10);
    expect((await loadAdminHub(900)).unreadMessages).toBeUndefined();
  });

  it('S1: a rejected unread read yields undefined, not 0', async () => {
    const { loadAdminHub } = await load(new Error('down'), 10);
    const hub = await loadAdminHub(900);
    expect(hub.unreadMessages).toBeUndefined();
    expect(hub.content).toBeDefined();
  });

  it('S1: the unread read is filtered with unread: true', async () => {
    const { loadAdminHub, messages } = await load(2, 10);
    await loadAdminHub(900);
    expect(messages).toHaveBeenCalledWith(1, 0, { unread: true });
  });

  it('S1: the existing unfiltered read is kept', async () => {
    const { loadAdminHub, messages } = await load(2, 10);
    await loadAdminHub(900);
    expect(messages.mock.calls.some(call => call[2] === undefined)).toBe(true);
  });

  it('S1 twin: with the unread guard off, a rejected read yields 0', async () => {
    const { loadAdminHub } = await load(new Error('down'), 10, true);
    expect((await loadAdminHub(900)).unreadMessages).toBe(0);
  });

  it('A7 twin: with the unread guard off, a zero total comes through as 0', async () => {
    const { loadAdminHub } = await load(0, 10, true);
    expect((await loadAdminHub(900)).unreadMessages).toBe(0);
  });
});
