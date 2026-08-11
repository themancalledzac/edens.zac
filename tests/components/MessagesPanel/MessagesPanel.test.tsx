import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as messagesApi from '@/app/lib/api/messages';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('@/app/lib/api/messages');

const mockGet = messagesApi.getAdminMessages as jest.MockedFunction<
  typeof messagesApi.getAdminMessages
>;
const mockDelete = messagesApi.deleteAdminMessage as jest.MockedFunction<
  typeof messagesApi.deleteAdminMessage
>;

const makeMessage = (
  id: number,
  email: string,
  message: string,
  createdAt: string
): messagesApi.AdminMessageView => ({ id, email, message, createdAt });

describe('MessagesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    window.confirm = jest.fn(() => true);
  });

  it('shows empty state when no messages', async () => {
    mockGet.mockResolvedValue({ messages: [], total: 0, limit: 100, offset: 0 });
    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText(/no comments yet/i)).toBeInTheDocument());
  });

  it('renders messages newest-first when given unsorted fixtures', async () => {
    const older = makeMessage(1, 'alice@example.com', 'Older message', '2024-01-01T10:00:00Z');
    const newer = makeMessage(2, 'bob@example.com', 'Newer message', '2024-06-01T10:00:00Z');
    mockGet.mockResolvedValue({ messages: [older, newer], total: 2, limit: 100, offset: 0 });

    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument());

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('bob@example.com');
    expect(items[1]).toHaveTextContent('alice@example.com');
  });

  it('removes message optimistically on delete', async () => {
    const msg = makeMessage(1, 'alice@example.com', 'Hello world', new Date().toISOString());
    mockGet.mockResolvedValue({ messages: [msg], total: 1, limit: 100, offset: 0 });
    mockDelete.mockResolvedValue();

    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument());
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  // `getAdminMessages` throws (via fetchAdminGetApi) on any non-OK response. Without a catch the
  // `finally` never runs and the panel sits on "Loading…" forever.
  it('surfaces a load failure instead of spinning on "Loading…" forever', async () => {
    mockGet.mockRejectedValue(new Error('Backend unreachable'));

    render(<MessagesPanel />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load messages/i)
    );
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  /**
   * `UserManagementPanel` has had a Retry on this branch since 95d187c. The two panels sit side by
   * side on /admin and fail for the same reason — one of them demanding a full page reload to
   * recover from the same blip was a difference with nothing behind it.
   */
  it('offers Retry on a load failure and refetches when it is pressed', async () => {
    mockGet.mockRejectedValueOnce(new Error('Backend unreachable'));
    mockGet.mockResolvedValueOnce({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // The live region has to predate the text it announces, so the panel renders it outside the body
  // branch. Node identity across the transition is what proves it was not inserted mid-flight.
  it('announces the read through one region that outlives the load', async () => {
    let resolveMessages!: (page: messagesApi.AdminMessageList) => void;
    mockGet.mockImplementation(
      () =>
        new Promise<messagesApi.AdminMessageList>(resolve => {
          resolveMessages = resolve;
        })
    );

    render(<MessagesPanel />);

    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('Loading…');
    expect(region).toHaveAttribute('aria-live', 'polite');

    resolveMessages({ messages: [], total: 0, limit: 100, offset: 0 });

    await waitFor(() => expect(screen.getByText(/no comments yet/i)).toBeInTheDocument());
    expect(screen.getByRole('status')).toBe(region);
    expect(region).toBeEmptyDOMElement();
  });

  it('does not show the empty state when the load failed', async () => {
    mockGet.mockRejectedValue(new Error('Backend unreachable'));

    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByText(/no comments yet/i)).not.toBeInTheDocument();
  });

  it('rolls back optimistic delete on failure', async () => {
    const msg = makeMessage(1, 'alice@example.com', 'Hello world', new Date().toISOString());
    mockGet.mockResolvedValue({ messages: [msg], total: 1, limit: 100, offset: 0 });
    mockDelete.mockRejectedValue(new Error('Network error'));

    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(screen.getByText(/failed to delete/i)).toBeInTheDocument());
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });
});
