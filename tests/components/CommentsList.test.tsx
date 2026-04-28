import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { CommentsList } from '@/app/(admin)/comments/CommentsList';
import * as messagesApi from '@/app/lib/api/messages';

jest.mock('@/app/lib/api/messages');

const mockGet = messagesApi.getAdminMessages as jest.MockedFunction<
  typeof messagesApi.getAdminMessages
>;

describe('CommentsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no messages', () => {
    render(<CommentsList initialMessages={[]} initialTotal={0} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('renders message rows with email mailto link and body', () => {
    const fixture = [
      {
        id: 1,
        email: 'alice@example.com',
        message: 'Hello!',
        createdAt: new Date().toISOString(),
      },
    ];
    render(<CommentsList initialMessages={fixture} initialTotal={1} />);
    const link = screen.getByRole('link', { name: /alice@example\.com/ });
    expect(link).toHaveAttribute('href', 'mailto:alice@example.com');
    expect(screen.getByText('Hello!')).toBeInTheDocument();
  });

  it('does NOT render Load more when initial = total', () => {
    const fixture = [
      {
        id: 1,
        email: 'a@b.co',
        message: 'x',
        createdAt: new Date().toISOString(),
      },
    ];
    render(<CommentsList initialMessages={fixture} initialTotal={1} />);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('renders Load more button when more messages exist, fetches next page on click', async () => {
    const fixture = [
      {
        id: 1,
        email: 'a@b.co',
        message: 'first',
        createdAt: new Date().toISOString(),
      },
    ];
    mockGet.mockResolvedValue({
      messages: [
        {
          id: 2,
          email: 'b@b.co',
          message: 'second',
          createdAt: new Date().toISOString(),
        },
      ],
      total: 2,
      limit: 50,
      offset: 1,
    });

    render(<CommentsList initialMessages={fixture} initialTotal={2} />);
    const btn = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('second')).toBeInTheDocument();
    });
    expect(mockGet).toHaveBeenCalledWith(50, 1);
  });

  it('renders relative timestamp', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const fixture = [{ id: 1, email: 'a@b.co', message: 'x', createdAt: oneHourAgo }];
    render(<CommentsList initialMessages={fixture} initialTotal={1} />);
    // Intl.RelativeTimeFormat output for ~1 hour ago is "1 hour ago" or "an hour ago" depending on locale settings
    expect(screen.getByRole('time')).toHaveAttribute('dateTime', oneHourAgo);
  });
});
