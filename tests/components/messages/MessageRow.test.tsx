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

  it('shows "Deleting..." and disables the button while deleting', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting styles={styles} />);
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });
});
