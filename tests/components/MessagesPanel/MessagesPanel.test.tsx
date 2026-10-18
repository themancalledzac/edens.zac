import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { type ReactNode } from 'react';
import ts from 'typescript';

import * as panelBodyModule from '@/app/components/ListPanel/PanelBody';
import type * as messageRowModule from '@/app/components/messages/MessageRow';
import * as messagesPanelModule from '@/app/components/MessagesPanel/MessagesPanel';
import { MessagesPanel } from '@/app/components/MessagesPanel/MessagesPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as messagesApi from '@/app/lib/api/messages';
import * as sortModule from '@/app/utils/sortByDate';

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

jest.mock('@/app/components/ListPanel/PanelBody', () => {
  const actual = jest.requireActual<typeof panelBodyModule>('@/app/components/ListPanel/PanelBody');
  return { ...actual, PanelBody: jest.fn(actual.PanelBody) };
});

jest.mock('@/app/utils/sortByDate', () => {
  const actual = jest.requireActual<typeof sortModule>('@/app/utils/sortByDate');
  return { ...actual, sortByDate: jest.fn(actual.sortByDate) };
});

const mockGet = messagesApi.getAdminMessages as jest.MockedFunction<
  typeof messagesApi.getAdminMessages
>;
const mockDelete = messagesApi.deleteAdminMessage as jest.MockedFunction<
  typeof messagesApi.deleteAdminMessage
>;

const messageRowActual = jest.requireActual<typeof messageRowModule>(
  '@/app/components/messages/MessageRow'
);

const mockMarkRead = messagesApi.markMessageRead as jest.MockedFunction<
  typeof messagesApi.markMessageRead
>;

const makeMessage = (
  id: number,
  email: string,
  message: string,
  createdAt: string
): messagesApi.AdminMessageView => ({ id, email, message, createdAt, readAt: null });

describe('MessagesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(sortModule.sortByDate)
      .mockImplementation(
        jest.requireActual<typeof sortModule>('@/app/utils/sortByDate').sortByDate
      );
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

  it('A15: sorts through sortByDate(messages, "desc")', async () => {
    const older = makeMessage(1, 'alice@example.com', 'Older message', '2024-01-01T10:00:00Z');
    const newer = makeMessage(2, 'bob@example.com', 'Newer message', '2024-06-01T10:00:00Z');
    mockGet.mockResolvedValue({ messages: [older, newer], total: 2, limit: 100, offset: 0 });

    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument());

    expect(sortModule.sortByDate).toHaveBeenCalledWith(expect.any(Array), 'desc');
  });

  it('A15-guard: the newest-first assertion fails when the list is sorted oldest-first', async () => {
    const actual = jest.requireActual<typeof sortModule>('@/app/utils/sortByDate');
    jest
      .mocked(sortModule.sortByDate)
      .mockImplementation(<T extends { createdAt?: string | null }>(items: T[]) =>
        actual.sortByDate(items, 'asc')
      );
    const older = makeMessage(1, 'alice@example.com', 'Older message', '2024-01-01T10:00:00Z');
    const newer = makeMessage(2, 'bob@example.com', 'Newer message', '2024-06-01T10:00:00Z');
    mockGet.mockResolvedValue({ messages: [newer, older], total: 2, limit: 100, offset: 0 });

    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText('bob@example.com')).toBeInTheDocument());

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('alice@example.com');
    expect(items[0]).not.toHaveTextContent('bob@example.com');
  });

  it('A4: a message row is one line: email, a muted excerpt after a middle dot, and the relative time', async () => {
    const created = new Date(Date.now() - 3 * 3_600_000).toISOString();
    mockGet.mockResolvedValue({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world friend', created)],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    const email = await screen.findByText('alice@example.com');
    const row = screen.getByRole('listitem');

    expect(row).toHaveTextContent('alice@example.com · Hello world friend');
    expect(email.compareDocumentPosition(screen.getByText(/Hello world friend/))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(row).toHaveTextContent(/3 hours ago/);
    expect(
      within(row)
        .getByText(/Hello world friend/)
        .closest('span')
    ).toHaveClass('rowSecondary');
  });

  it('A4: the row itself is the only clickable element', async () => {
    mockGet.mockResolvedValue({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;

    expect(within(row).getAllByRole('button')).toHaveLength(1);
    expect(within(row).queryAllByRole('link')).toHaveLength(0);
    expect(within(row).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(within(row).queryByText(/reply in gmail/i)).not.toBeInTheDocument();
  });

  it('A4: an unread row is at 600 and a read row is not', async () => {
    mockGet.mockResolvedValue({
      messages: [
        makeMessage(1, 'alice@example.com', 'Unread one', '2024-06-01T10:00:00Z'),
        {
          ...makeMessage(2, 'bob@example.com', 'Read one', '2024-01-01T10:00:00Z'),
          readAt: '2024-01-02T10:00:00Z',
        },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);

    expect(await screen.findByText('alice@example.com')).toHaveClass('rowEmphasis');
    expect(screen.getByText('bob@example.com')).not.toHaveClass('rowEmphasis');
  });

  it('A5: tapping a row opens a sheet with the full message, mailto, Reply in Gmail, Mark read and Delete', async () => {
    const full = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    mockGet.mockResolvedValue({
      messages: [makeMessage(1, 'alice@example.com', full, '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(full)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /alice@example\.com/ })).toHaveAttribute(
      'href',
      'mailto:alice@example.com'
    );
    expect(
      within(dialog)
        .getByRole('link', { name: /reply in gmail/i })
        .getAttribute('href')
    ).toContain('mail.google.com');
    expect(within(dialog).getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('A5: a read message offers Mark unread in its sheet', async () => {
    mockGet.mockResolvedValue({
      messages: [
        {
          ...makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z'),
          readAt: '2024-01-02T10:00:00Z',
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Mark unread' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Mark read' })).not.toBeInTheDocument();
  });

  it('A5: Mark read in the sheet calls markMessageRead(id, true)', async () => {
    mockGet.mockResolvedValue({
      messages: [makeMessage(7, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });
    mockMarkRead.mockResolvedValue();

    render(<MessagesPanel />);
    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Mark read' })
    );

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith(7, true));
  });

  it('A5: Delete in the sheet deletes the message', async () => {
    mockGet.mockResolvedValue({
      messages: [makeMessage(3, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });
    mockDelete.mockResolvedValue();

    render(<MessagesPanel />);
    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /delete/i })
    );

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('M3/S1: opening the sheet does not call markMessageRead; the message stays unread', async () => {
    mockGet.mockResolvedValue({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    const email = await screen.findByText('alice@example.com');
    fireEvent.click(within(email.closest('li') as HTMLElement).getByRole('button'));
    await screen.findByRole('dialog');

    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark read' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('alice@example.com')[0]).toHaveClass('rowEmphasis');
  });

  it('M3/S1 twin: with the open-marks-read guard on, opening the sheet calls markMessageRead', async () => {
    jest.spyOn(messagesPanelModule.messagesPanelGuards, 'marksReadOnOpen').mockReturnValue(true);
    mockMarkRead.mockResolvedValue();
    mockGet.mockResolvedValue({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<MessagesPanel />);
    const email = await screen.findByText('alice@example.com');
    fireEvent.click(within(email.closest('li') as HTMLElement).getByRole('button'));
    await screen.findByRole('dialog');

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalled());
  });

  it('A8: the loading, error, empty and stale states render through PanelBody', async () => {
    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGet.mockResolvedValue({ messages: [], total: 0, limit: 100, offset: 0 });
    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText(/no comments yet/i)).toBeInTheDocument());
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.some(([props]) => props.loading)).toBe(true);
    expect(spy.mock.calls.some(([props]) => props.isEmpty && !props.loading)).toBe(true);
  });

  it('A8: a load failure reaches PanelBody as loadError', async () => {
    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGet.mockRejectedValue(new Error('Backend unreachable'));
    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(spy.mock.calls.some(([props]) => props.loadError !== null && !props.loading)).toBe(true);
  });

  it('A8: a failed background refresh reaches PanelBody as revalidationFailed', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });
    const warm = render(<MessagesPanel />);
    await screen.findByText('alice@example.com');
    warm.unmount();

    const spy = jest.mocked(panelBodyModule.PanelBody);
    spy.mockClear();
    mockGet.mockRejectedValueOnce(new Error('Backend unreachable'));
    render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
    expect(spy.mock.calls.some(([props]) => props.revalidationFailed)).toBe(true);
  });

  it('A12: the MessageRow card keeps its exports and its class names', () => {
    const view = makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z');
    expect(typeof messageRowActual.MessageRow).toBe('function');
    expect(typeof messageRowActual.default).toBe('function');
    render(<messageRowActual.MessageRow message={view} onDelete={jest.fn()} deleting={false} />);

    expect(screen.getByText('alice@example.com').closest('a')).toHaveClass('email');
    expect(screen.getByText('Hello world')).toHaveClass('body');
    expect(screen.getByRole('link', { name: /reply in gmail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('A12 twin: with the card stylesheet resolving no classes the email link and body lose them', () => {
    const view = makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z');
    jest.isolateModules(() => {
      jest.doMock('@/app/components/messages/MessageRow.module.scss', () => ({
        __esModule: true,
        default: {},
      }));
      const { MessageRow } = jest.requireActual<typeof messageRowModule>(
        '@/app/components/messages/MessageRow'
      );
      render(<MessageRow message={view} onDelete={jest.fn()} deleting={false} />);
    });
    jest.dontMock('@/app/components/messages/MessageRow.module.scss');

    expect(screen.getByText('alice@example.com').closest('a')).not.toHaveClass('email');
    expect(screen.getByText('Hello world')).not.toHaveClass('body');
  });

  it('M7: no inline comments inside function bodies of the panel source', () => {
    const file = join(process.cwd(), 'app/components/MessagesPanel/MessagesPanel.tsx');
    const source = readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const offenders: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isBlock(node) && node.parent && ts.isFunctionLike(node.parent)) {
        const text = source.slice(node.getStart(), node.getEnd());
        const scanner = ts.createScanner(
          ts.ScriptTarget.Latest,
          false,
          ts.LanguageVariant.Standard,
          text
        );
        for (let t = scanner.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = scanner.scan()) {
          if (
            t === ts.SyntaxKind.SingleLineCommentTrivia ||
            t === ts.SyntaxKind.MultiLineCommentTrivia
          ) {
            offenders.push(scanner.getTokenText());
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    expect(offenders).toEqual([]);
  });

  /**
   * `getAdminMessages` throws (via fetchAdminGetApi) on any non-OK response. Without a catch the
   * `finally` never runs and the panel sits on "Loading…" forever.
   */
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

  /**
   * A warm cache turns a dead backend into a silent one: the list paints from localStorage, the
   * background revalidation fails, and nothing on screen says the messages are last session's.
   * The notice is the only thing standing between "cached" and "current".
   */
  it('says the list is cached when a background refresh fails', async () => {
    mockGet.mockResolvedValueOnce({
      messages: [makeMessage(1, 'alice@example.com', 'Hello world', '2024-01-01T10:00:00Z')],
      total: 1,
      limit: 100,
      offset: 0,
    });
    const warm = render(<MessagesPanel />);
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument());
    warm.unmount();

    mockGet.mockRejectedValueOnce(new Error('Backend unreachable'));
    render(<MessagesPanel />);

    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * The live region has to predate the text it announces, so the panel renders it outside the body
   * branch. Node identity across the transition is what proves it was not inserted mid-flight.
   */
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

    const row = (await screen.findByText('alice@example.com')).closest('li') as HTMLElement;
    fireEvent.click(within(row).getByRole('button'));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /delete/i })
    );

    await waitFor(() => expect(screen.getByText(/failed to delete/i)).toBeInTheDocument());
    expect(screen.getAllByText('alice@example.com').length).toBeGreaterThan(0);
  });
});
