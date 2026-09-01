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

describe('CommentsList — search', () => {
  const msg = (id: number, email: string, message: string) => ({
    id,
    email,
    message,
    createdAt: new Date().toISOString(),
  });

  const three = () => [
    msg(1, 'alice@example.com', 'Loved the Dolomites set'),
    msg(2, 'bob@example.com', 'Question about prints'),
    msg(3, 'carol@example.com', 'Booking enquiry'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by message body', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'prints' },
    });
    expect(screen.getByText('Question about prints')).toBeInTheDocument();
    expect(screen.queryByText('Loved the Dolomites set')).not.toBeInTheDocument();
    expect(screen.queryByText('Booking enquiry')).not.toBeInTheDocument();
  });

  it('filters by email, case-insensitively', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'CAROL' },
    });
    expect(screen.getByText('Booking enquiry')).toBeInTheDocument();
    expect(screen.queryByText('Question about prints')).not.toBeInTheDocument();
  });

  it('reports how much of the loaded set matched', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'e' },
    });
    expect(screen.getByRole('status')).toHaveTextContent(/of 3 loaded/);
  });

  it('says so when messages remain unloaded, so search never looks exhaustive', () => {
    render(<CommentsList initialMessages={three()} initialTotal={40} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'prints' },
    });
    expect(screen.getByRole('status')).toHaveTextContent(/37 not yet loaded/);
  });

  it('omits the unloaded note when everything is loaded', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'prints' },
    });
    expect(screen.getByRole('status')).not.toHaveTextContent(/not yet loaded/);
  });

  it('shows an empty state naming the query when nothing matches', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText(/no messages match/i)).toHaveTextContent('zzzz');
  });

  it('keeps Load more available while searching', () => {
    render(<CommentsList initialMessages={three()} initialTotal={40} />);
    fireEvent.change(screen.getByLabelText(/search messages/i), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('restores the full list when the query is cleared', () => {
    render(<CommentsList initialMessages={three()} initialTotal={3} />);
    const box = screen.getByLabelText(/search messages/i);
    fireEvent.change(box, { target: { value: 'prints' } });
    expect(screen.queryByText('Booking enquiry')).not.toBeInTheDocument();
    fireEvent.change(box, { target: { value: '' } });
    expect(screen.getByText('Booking enquiry')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows no search box before any message exists', () => {
    render(<CommentsList initialMessages={[]} initialTotal={0} />);
    expect(screen.queryByLabelText(/search messages/i)).not.toBeInTheDocument();
  });
});
