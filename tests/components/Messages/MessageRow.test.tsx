import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';

import { MessageRow } from '@/app/components/Messages/MessageRow';
import type { AdminMessageView } from '@/app/lib/api/messages';

const message: AdminMessageView = {
  id: 1,
  email: 'alice@example.com',
  message: 'one two three four five six seven eight nine ten eleven twelve',
  createdAt: new Date().toISOString(),
  readAt: null,
};

describe('MessageRow', () => {
  it('renders a mailto link for the email', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.getByRole('link', { name: /alice@example\.com/ })).toHaveAttribute(
      'href',
      'mailto:alice@example.com'
    );
  });

  it('renders a Gmail reply link', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    const reply = screen.getByRole('link', { name: /reply in gmail/i });
    expect(reply.getAttribute('href')).toContain('mail.google.com');
  });

  it('renders the full message body when excerptWords is not set', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.getByText(message.message)).toBeInTheDocument();
  });

  it('truncates the body to excerptWords and keeps the full text in the title', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} excerptWords={3} />);
    const body = screen.getByText('one two three…');
    expect(body).toHaveAttribute('title', message.message);
  });

  it('calls onDelete with the message when Delete is clicked', () => {
    const onDelete = jest.fn();
    render(<MessageRow message={message} onDelete={onDelete} deleting={false} />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(message);
  });

  it('shows "Deleting…" and disables the button while deleting', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting />);
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
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.queryByRole('button', { name: /mark (un)?read/i })).not.toBeInTheDocument();
  });

  it('renders no Unread badge when onToggleRead is omitted, even on an unread message', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
  });

  it('badges an unread message once the caller opts in', () => {
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
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
        onToggleRead={jest.fn()}
        togglingRead
      />
    );
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeDisabled();
  });
});

const ROOT = join(__dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * A10 — the row renders with classes from its own stylesheet. next/jest maps a CSS module to a
 * proxy that returns each class name as written, so a class on the element proves the binding.
 */
describe('MessageRow — own stylesheet (A10)', () => {
  it('puts the module classes on the email link and body', () => {
    render(<MessageRow message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.getByRole('link', { name: /alice@example\.com/ })).toHaveClass('email');
    expect(screen.getByText(message.message)).toHaveClass('body');
  });

  it('puts the module classes on the meta line, time, actions and reply button', () => {
    const { container } = render(
      <MessageRow message={message} onDelete={jest.fn()} deleting={false} />
    );
    expect(container.querySelector('.meta')).not.toBeNull();
    expect(container.querySelector('time')).toHaveClass('time');
    expect(container.querySelector('.actions')).not.toBeNull();
    expect(screen.getByRole('link', { name: /reply in gmail/i })).toHaveClass('replyButton');
  });

  it('puts the unread class on the badge', () => {
    render(
      <MessageRow
        message={message}
        onDelete={jest.fn()}
        deleting={false}
        onToggleRead={jest.fn()}
      />
    );
    expect(screen.getByText('Unread')).toHaveClass('unread');
  });

  it('defines every class in MessageRow.module.scss', () => {
    const scss = read('app/components/Messages/MessageRow.module.scss');
    for (const name of ['email', 'body', 'time', 'actions', 'replyButton', 'meta', 'unread']) {
      expect(scss).toMatch(new RegExp(`\\.${name}\\b`));
    }
  });
});

/**
 * A10-guard — the class comes from the imported stylesheet. With the stylesheet's classes gone the
 * email link and body lose theirs, which is what the main test above would catch.
 */
describe('MessageRow — guard twin (A10-guard)', () => {
  afterEach(() => {
    jest.dontMock('@/app/components/Messages/MessageRow.module.scss');
    jest.resetModules();
  });

  it('twin: email link and body have no class when the stylesheet exports nothing', () => {
    jest.resetModules();
    jest.doMock('@/app/components/Messages/MessageRow.module.scss', () => ({
      __esModule: true,
      default: {},
    }));
    const { MessageRow: Bare } = jest.requireActual('@/app/components/Messages/MessageRow');
    render(<Bare message={message} onDelete={jest.fn()} deleting={false} />);
    expect(screen.getByRole('link', { name: /alice@example\.com/ })).not.toHaveClass('email');
    expect(screen.getByText(message.message)).not.toHaveClass('body');
  });
});

/**
 * A11 — callers pass no styles prop and the row file takes none.
 */
describe('MessageRow — no styles prop (A11)', () => {
  it('MessageRow.tsx imports its own stylesheet and declares no styles prop', () => {
    const src = read('app/components/Messages/MessageRow.tsx');
    expect(src).toMatch(/from '\.\/MessageRow\.module\.scss'/);
    expect(src).not.toMatch(/styles\s*:\s*MessageRowStyles/);
    expect(src).not.toMatch(/\bstyles={styles}/);
  });

  it.each([
    'app/components/MessagesPanel/MessagesPanel.tsx',
    'app/(site)/(admin)/comments/CommentsList.tsx',
  ])('%s passes no styles to a message row', file => {
    const src = read(file);
    const tags = src.match(/<MessageRow\w*\b[\S\s]*?\/>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(tag).not.toMatch(/\bstyles=/);
    }
  });

  it('this test file passes no styles prop', () => {
    expect(read('tests/components/Messages/MessageRow.test.tsx')).not.toMatch(/\bstyles={/);
  });
});

/**
 * M5 — docblocks only, no inline comments in MessageRow.tsx.
 */
describe('MessageRow.tsx — comments (M5)', () => {
  it('has no inline // comments', () => {
    const lines = read('app/components/Messages/MessageRow.tsx').split('\n');
    const inline = lines.filter(l => /(^|\s)\/\/(?!.*["'`]\s*$)/.test(l) && !l.includes('://'));
    expect(inline).toEqual([]);
  });
});
