/**
 * Component tests for the messages admin list.
 *
 * Search and the read filter are server-side: the assertions are about what `getAdminMessages` was
 * asked for and what the component does with the answer, not about a local array being filtered.
 * Typing is debounced, so every search case advances timers before asserting.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CommentsList } from '@/app/(admin)/comments/CommentsList';
import type { AdminMessageView } from '@/app/lib/api/messages';
import * as messagesApi from '@/app/lib/api/messages';

jest.mock('@/app/lib/api/messages');

const mockGet = messagesApi.getAdminMessages as jest.MockedFunction<
  typeof messagesApi.getAdminMessages
>;
const mockMarkRead = messagesApi.markMessageRead as jest.MockedFunction<
  typeof messagesApi.markMessageRead
>;

const DEBOUNCE = 300;

const msg = (id: number, email: string, message: string, readAt: string | null = null) => ({
  id,
  email,
  message,
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  readAt,
});

const page = (messages: AdminMessageView[], total = messages.length) => ({
  messages,
  total,
  limit: 50,
  offset: 0,
});

/** Type into the search box and let the debounce fire, flushing the request it starts. */
async function search(value: string) {
  fireEvent.change(screen.getByLabelText(/search messages/i), { target: { value } });
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE);
  });
}

/**
 * The Unread badges only. Scoped to the span because the read filter's own "Unread" option is a
 * second node with that exact text, and a bare text query would count it.
 */
function unreadBadges() {
  return screen.queryAllByText('Unread', { selector: 'span' });
}

/** Change the read filter, which refetches immediately — there is nothing to debounce. */
async function setReadFilter(value: 'all' | 'unread' | 'read') {
  fireEvent.change(screen.getByLabelText(/filter by read state/i), { target: { value } });
  await act(async () => {});
}

describe('CommentsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMarkRead.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders empty state when no messages', () => {
    render(<CommentsList initialMessages={[]} initialTotal={0} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('shows no search box before any message exists', () => {
    render(<CommentsList initialMessages={[]} initialTotal={0} />);
    expect(screen.queryByLabelText(/search messages/i)).not.toBeInTheDocument();
  });

  it('renders message rows with email mailto link and body', () => {
    render(
      <CommentsList initialMessages={[msg(1, 'alice@example.com', 'Hello!')]} initialTotal={1} />
    );
    expect(screen.getByRole('link', { name: /alice@example\.com/ })).toHaveAttribute(
      'href',
      'mailto:alice@example.com'
    );
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('does NOT render Load more when initial = total', () => {
    render(<CommentsList initialMessages={[msg(1, 'a@b.co', 'x')]} initialTotal={1} />);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('renders Load more when more exist, and pages with the active filter', async () => {
    mockGet.mockResolvedValue(page([msg(2, 'b@b.co', 'second')], 2));
    render(<CommentsList initialMessages={[msg(1, 'a@b.co', 'first')]} initialTotal={2} />);

    fireEvent.click(screen.getByRole('button', { name: /load more/i }));
    await waitFor(() => expect(screen.getByText('second')).toBeInTheDocument());

    expect(mockGet).toHaveBeenCalledWith(50, 1, { q: '', unread: undefined });
  });

  it('renders relative timestamp', () => {
    const created = new Date('2026-01-01T00:00:00.000Z').toISOString();
    render(<CommentsList initialMessages={[msg(1, 'a@b.co', 'x')]} initialTotal={1} />);
    expect(screen.getByRole('time')).toHaveAttribute('dateTime', created);
  });
});

describe('CommentsList — server-side search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const three = () => [
    msg(1, 'alice@example.com', 'Loved the Dolomites set'),
    msg(2, 'bob@example.com', 'Question about prints'),
    msg(3, 'carol@example.com', 'Booking enquiry'),
  ];

  it('asks the backend for the query rather than filtering the loaded page', async () => {
    mockGet.mockResolvedValue(page([msg(2, 'bob@example.com', 'Question about prints')], 1));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('prints');

    expect(mockGet).toHaveBeenCalledWith(50, 0, { q: 'prints', unread: undefined });
  });

  it('renders exactly what the backend returned, not a local subset', async () => {
    mockGet.mockResolvedValue(page([msg(9, 'dave@example.com', 'Never loaded before')], 1));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('never');

    expect(screen.getByText('Never loaded before')).toBeInTheDocument();
    expect(screen.queryByText('Booking enquiry')).not.toBeInTheDocument();
  });

  it('sends one request for a burst of keystrokes', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    const box = screen.getByLabelText(/search messages/i);

    fireEvent.change(box, { target: { value: 'p' } });
    fireEvent.change(box, { target: { value: 'pr' } });
    fireEvent.change(box, { target: { value: 'pri' } });
    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE);
    });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(50, 0, { q: 'pri', unread: undefined });
  });

  it('reports the filtered total, which now counts the whole table', async () => {
    mockGet.mockResolvedValue(page([msg(2, 'bob@example.com', 'Question about prints')], 12));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('prints');

    expect(screen.getByRole('status')).toHaveTextContent('12 matching');
  });

  it('no longer claims the search saw only the loaded page', async () => {
    mockGet.mockResolvedValue(page([msg(2, 'bob@example.com', 'Question about prints')], 1));
    render(<CommentsList initialMessages={three()} initialTotal={40} />);

    await search('prints');

    expect(screen.getByRole('status')).not.toHaveTextContent(/not yet loaded/);
    expect(screen.getByRole('status')).not.toHaveTextContent(/loaded/);
  });

  it('shows an empty state naming the query when the backend returns nothing', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('zzzz');

    expect(screen.getByText(/no messages match/i)).toHaveTextContent('zzzz');
  });

  it('keeps the controls mounted when a search returns nothing', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('zzzz');

    expect(screen.getByLabelText(/search messages/i)).toBeInTheDocument();
    expect(screen.queryByText(/no comments yet/i)).not.toBeInTheDocument();
  });

  it('refetches the unfiltered list when the query is cleared', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    await search('prints');

    mockGet.mockResolvedValue(page(three(), 3));
    await search('');

    expect(mockGet).toHaveBeenLastCalledWith(50, 0, { q: '', unread: undefined });
    expect(screen.getByText('Booking enquiry')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('drops a stale response so a slow early keystroke cannot overwrite a later one', async () => {
    let resolveFirst: (v: ReturnType<typeof page>) => void = () => {};
    mockGet.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirst = resolve;
        })
    );
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    await search('slow');

    mockGet.mockResolvedValue(page([msg(7, 'zoe@example.com', 'fast result')], 1));
    await search('fast');

    await act(async () => {
      resolveFirst(page([msg(8, 'stale@example.com', 'stale result')], 1));
    });

    expect(screen.getByText('fast result')).toBeInTheDocument();
    expect(screen.queryByText('stale result')).not.toBeInTheDocument();
  });

  it('reports a failed search instead of silently showing the old list', async () => {
    mockGet.mockRejectedValue(new Error('boom'));
    render(<CommentsList initialMessages={three()} initialTotal={3} />);

    await search('prints');

    expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument();
  });
});

describe('CommentsList — read state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMarkRead.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mixed = () => [
    msg(1, 'alice@example.com', 'unread one'),
    msg(2, 'bob@example.com', 'read one', '2026-01-02T00:00:00.000Z'),
  ];

  it('badges an unread message and leaves a read one unbadged', () => {
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);
    expect(unreadBadges()).toHaveLength(1);
  });

  it('offers Mark read on an unread message and Mark unread on a read one', () => {
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark unread' })).toBeInTheDocument();
  });

  it('marks read optimistically, before the request settles', async () => {
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    });

    expect(mockMarkRead).toHaveBeenCalledWith(1, true);
    expect(unreadBadges()).toHaveLength(0);
  });

  it('marks unread back again', async () => {
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark unread' }));
    });

    expect(mockMarkRead).toHaveBeenCalledWith(2, false);
    expect(unreadBadges()).toHaveLength(2);
  });

  it('restores the badge and reports an error when the request fails', async () => {
    mockMarkRead.mockRejectedValue(new Error('boom'));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    });

    expect(unreadBadges()).toHaveLength(1);
    expect(screen.getByText(/failed to mark message/i)).toBeInTheDocument();
  });

  it('asks the backend for unread only', async () => {
    mockGet.mockResolvedValue(page([msg(1, 'alice@example.com', 'unread one')], 1));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await setReadFilter('unread');

    expect(mockGet).toHaveBeenCalledWith(50, 0, { q: '', unread: true });
  });

  it('asks the backend for read only, sending false rather than omitting it', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await setReadFilter('read');

    expect(mockGet).toHaveBeenCalledWith(50, 0, { q: '', unread: false });
  });

  it('returns to both states when the filter goes back to All', async () => {
    mockGet.mockResolvedValue(page(mixed(), 2));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);
    await setReadFilter('unread');

    await setReadFilter('all');

    expect(mockGet).toHaveBeenLastCalledWith(50, 0, { q: '', unread: undefined });
  });

  it('combines the query and the read filter in one request', async () => {
    mockGet.mockResolvedValue(page([], 0));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);

    await setReadFilter('unread');
    await search('prints');

    expect(mockGet).toHaveBeenLastCalledWith(50, 0, { q: 'prints', unread: true });
  });

  it('drops a row from the Unread view once it is marked read', async () => {
    mockGet.mockResolvedValue(page([msg(1, 'alice@example.com', 'unread one')], 1));
    render(<CommentsList initialMessages={mixed()} initialTotal={2} />);
    await setReadFilter('unread');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    });

    expect(screen.queryByText('unread one')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 matching');
  });
});
