import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';

import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
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
