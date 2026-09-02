import { fireEvent, render, screen } from '@testing-library/react';

import { MessageRow } from '@/app/components/messages/MessageRow';
import type { AdminMessageView } from '@/app/lib/api/messages';

const styles = {
  meta: 'meta',
  email: 'email',
  time: 'time',
  body: 'body',
  actions: 'actions',
  replyButton: 'replyButton',
};

const message: AdminMessageView = {
  id: 1,
  email: 'alice@example.com',
  message: 'one two three four five six seven eight nine ten eleven twelve',
  createdAt: new Date().toISOString(),
  readAt: null,
};

describe('MessageRow', () => {
  it('renders a mailto link for the email', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} styles={styles} />);
    expect(screen.getByRole('link', { name: /alice@example\.com/ })).toHaveAttribute(
      'href',
      'mailto:alice@example.com'
    );
  });

  it('renders a Gmail reply link', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} styles={styles} />);
    const reply = screen.getByRole('link', { name: /reply in gmail/i });
    expect(reply.getAttribute('href')).toContain('mail.google.com');
  });

  it('renders the full message body when excerptWords is not set', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} styles={styles} />);
    expect(screen.getByText(message.message)).toBeInTheDocument();
  });

  it('truncates the body to excerptWords and keeps the full text in the title', () => {
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        excerptWords={3}
      />
    );
    const body = screen.getByText('one two three…');
    expect(body).toHaveAttribute('title', message.message);
  });

  it('calls onDelete with the message when Delete is clicked', () => {
    const onDelete = jest.fn();
    render(<MessageRow message={message} onDelete={onDelete} deleting={false} styles={styles} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(message);
  });

  it('shows "Deleting…" and disables the button while deleting', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting styles={styles} />);
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});

/**
 * Read state is opt-in via `onToggleRead`. These cases pin that a caller which does not pass it —
 * the admin hub's compact row — renders exactly what it rendered before read state existed.
 */
describe('MessageRow — read state', () => {
  const readMessage: AdminMessageView = { ...message, readAt: '2026-01-02T00:00:00.000Z' };

  it('renders no read button when onToggleRead is omitted', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} styles={styles} />);
    expect(screen.queryByRole('button', { name: /mark (un)?read/i })).not.toBeInTheDocument();
  });

  it('renders no Unread badge when onToggleRead is omitted, even on an unread message', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} styles={styles} />);
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
  });

  it('badges an unread message once the caller opts in', () => {
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={jest.fn()}
      />
    );
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('does not badge a message that has been read', () => {
    render(
      <MessageRow
        message={readMessage}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={jest.fn()}
      />
    );
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
  });

  it('labels the button by the action it performs, not the state it is in', () => {
    const { unmount } = render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
    unmount();

    render(
      <MessageRow
        message={readMessage}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={jest.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Mark unread' })).toBeInTheDocument();
  });

  it('calls onToggleRead with the message', () => {
    const onToggleRead = jest.fn();
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={onToggleRead}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    expect(onToggleRead).toHaveBeenCalledWith(message);
  });

  it('disables the button while its request is in flight', () => {
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        styles={styles}
        onToggleRead={jest.fn()}
        togglingRead
      />
    );
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeDisabled();
  });
});
