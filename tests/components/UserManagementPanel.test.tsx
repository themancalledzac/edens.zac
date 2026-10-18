/**
 * Tests for UserManagementPanel: one-line user rows, the detail sheet a row opens, and the create
 * form that stays in the panel body.
 *
 * Mocks next/navigation (router.push), the users API (list/create/update/regenerate), and stubs
 * the clipboard (InviteLinkResult / GenerateInviteButton use it).
 */

import fs from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ts from 'typescript';

import { panelBodyGuards } from '@/app/components/ListPanel/PanelBody';
import {
  UserManagementPanel,
  userPanelGuards,
} from '@/app/components/UserManagementPanel/UserManagementPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import * as rolesApi from '@/app/lib/api/roles';
import * as usersApi from '@/app/lib/api/users';
import { type AdminUserSummary } from '@/app/types/User';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/app/lib/api/users', () => ({
  listUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  regenerateInvite: jest.fn(),
}));

jest.mock('@/app/lib/api/roles', () => ({
  listUserRoles: jest.fn().mockResolvedValue([]),
  listRoles: jest.fn().mockResolvedValue([]),
  addUserToRole: jest.fn(() => Promise.resolve()),
  removeUserFromRole: jest.fn(() => Promise.resolve()),
}));

const mockListUsers = usersApi.listUsers as jest.MockedFunction<typeof usersApi.listUsers>;
const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;

Object.defineProperty(global.navigator, 'clipboard', {
  value: { writeText: jest.fn(() => Promise.resolve()) },
  writable: true,
});

const USERS: AdminUserSummary[] = [
  { id: 1, email: 'alice@x.com', displayName: 'Alice', status: 'ACTIVE', description: null },
  { id: 2, email: 'bob@x.com', displayName: null, status: 'INVITED', description: null },
];

const PANEL_DIR = path.join(process.cwd(), 'app/components/UserManagementPanel');
const PANEL_SOURCE = fs.readFileSync(path.join(PANEL_DIR, 'UserManagementPanel.tsx'), 'utf8');

/** Finds comments that sit inside a function body, using the TypeScript scanner. */
const commentScanner = {
  inFunctionBodies(source: string): string[] {
    const file = ts.createSourceFile(
      'x.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const found: string[] = [];
    const bodies: Array<[number, number]> = [];
    const visit = (node: ts.Node) => {
      if (ts.isFunctionLike(node) && 'body' in node && node.body && ts.isBlock(node.body)) {
        bodies.push([node.body.getStart(file), node.body.getEnd()]);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    const re = /\/\/[^\n]*|\/\*[\S\s]*?\*\//g;
    for (const m of source.matchAll(re)) {
      const at = m.index ?? 0;
      if (
        bodies.some(([a, b]) => at > a && at < b) &&
        !source.slice(Math.max(0, at - 1), at).includes(':')
      ) {
        found.push(m[0]);
      }
    }
    return found;
  },
};

const fileGuard = {
  unexpected(names: string[]): string[] {
    const allowed = new Set(['UserManagementPanel.tsx', 'UserManagementPanel.module.scss']);
    return names.filter(n => !allowed.has(n));
  },
};

describe('UserManagementPanel', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    mockListUsers.mockResolvedValue(USERS);
  });

  /**
   * A warm cache turns a dead backend into a silent one: the list paints from localStorage, the
   * background revalidation fails, and nothing on screen says the accounts are last session's.
   * The notice is the only thing standing between "cached" and "current".
   */
  it('says the list is cached when a background refresh fails', async () => {
    const warm = render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    warm.unmount();

    mockListUsers.mockRejectedValueOnce(new Error('Backend unreachable'));
    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists users with name, email, and status', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.getByText('alice@x.com')).toBeInTheDocument();
    expect(screen.getByText('bob@x.com')).toBeInTheDocument();
    expect(screen.getByText('INVITED')).toBeInTheDocument();
  });

  it('"+ New User" opens the create form; Cancel returns to the list', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new user/i }));
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  it('A4: each row is one line with dot, name, middle dot, email and a single button', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    expect(within(aliceRow).getAllByRole('button')).toHaveLength(1);
    expect(within(aliceRow).getByText('alice@x.com')).toBeInTheDocument();
    expect(aliceRow.textContent).toContain('·');
    expect(aliceRow.textContent?.indexOf('Alice')).toBeLessThan(
      aliceRow.textContent?.indexOf('alice@x.com') ?? -1
    );
    expect(within(aliceRow).queryByRole('button', { name: /update/i })).not.toBeInTheDocument();
    expect(within(aliceRow).queryByText(/reset/i)).not.toBeInTheDocument();
    expect(within(aliceRow).queryByText(/resend/i)).not.toBeInTheDocument();
  });

  it('A4: an invited user shows "Invited" as the row fact', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('bob@x.com')).toBeInTheDocument());

    const bobRow = screen.getByText('bob@x.com').closest('li') as HTMLElement;
    expect(within(bobRow).getByText('Invited')).toBeInTheDocument();
    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    expect(within(aliceRow).queryByText('Invited')).not.toBeInTheDocument();
  });

  it('A4: tapping a row opens the detail sheet and does not navigate', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const aliceRow = screen.getByText('Alice').closest('li') as HTMLElement;
    fireEvent.click(within(aliceRow).getByRole('button'));

    expect(await screen.findByRole('dialog', { name: /alice/i })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('A5: the sheet holds email, status select, roles with add, reset, open space and edit', async () => {
    mockListRoles.mockResolvedValueOnce([{ id: 3, name: 'power' }]);
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(
      within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('alice@x.com')).toBeInTheDocument();
    expect(within(dialog).getByRole('combobox', { name: /status/i })).toHaveValue('ACTIVE');
    expect(await within(dialog).findByRole('combobox', { name: /add role/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /reset/i })).toBeInTheDocument();
    expect(within(dialog).getByText(/open space/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /merge/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
  });

  it('A5: an invited user gets Resend in the sheet', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('bob@x.com')).toBeInTheDocument());
    fireEvent.click(
      within(screen.getByText('bob@x.com').closest('li') as HTMLElement).getByRole('button')
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /resend/i })).toBeInTheDocument();
  });

  it('A5: Open space goes to the user space page', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(
      within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
    );

    const dialog = await screen.findByRole('dialog');
    const link = within(dialog).queryByRole('link', { name: /open space/i });
    if (link) {
      expect(link).toHaveAttribute('href', '/admin/users/1');
    } else {
      fireEvent.click(within(dialog).getByRole('button', { name: /open space/i }));
      expect(mockPush).toHaveBeenCalledWith('/admin/users/1');
    }
  });

  it('A5: Edit opens the user form inside the sheet', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(
      within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
    );

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^edit$/i }));

    expect(
      await within(screen.getByRole('dialog')).findByRole('button', { name: /save/i })
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('A5: the sheet closes with its close button', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    fireEvent.click(
      within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
    );
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('A5: the tag-only toggle is a People filter chip', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    const chip = screen.getByRole('button', { name: /people/i });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText(/show tag-only people/i)).not.toBeInTheDocument();

    fireEvent.click(chip);
    expect(mockListUsers).toHaveBeenCalledWith({ includePeople: true });
    expect(screen.getByRole('button', { name: /people/i })).toHaveAttribute('aria-pressed', 'true');
  });

  describe('PERSON rows', () => {
    const PEOPLE: AdminUserSummary[] = [
      ...USERS,
      { id: 3, email: null, displayName: 'Zed Person', status: 'PERSON', description: null },
    ];

    const openPerson = async () => {
      mockListUsers.mockResolvedValue(PEOPLE);
      render(<UserManagementPanel />);
      fireEvent.click(await screen.findByRole('button', { name: /people/i }));
      const row = (await screen.findByText('Zed Person')).closest('li') as HTMLElement;
      fireEvent.click(within(row).getByRole('button'));
      return screen.findByRole('dialog');
    };

    it('S1: a PERSON sheet offers Merge… and Upgrade', async () => {
      const dialog = await openPerson();
      expect(within(dialog).getByRole('button', { name: /merge/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
    });

    it('S1: an account sheet offers neither Merge… nor Upgrade', async () => {
      mockListUsers.mockResolvedValue(PEOPLE);
      render(<UserManagementPanel />);
      fireEvent.click(await screen.findByRole('button', { name: /people/i }));
      await screen.findByText('Zed Person');
      fireEvent.click(
        within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
      );

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).queryByRole('button', { name: /merge/i })).not.toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: /upgrade/i })).not.toBeInTheDocument();
    });

    it('twin S1: with the person guard off, an account sheet offers Merge… and Upgrade', async () => {
      jest.spyOn(userPanelGuards, 'offersPersonActions').mockImplementation(() => true);
      render(<UserManagementPanel />);
      await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
      fireEvent.click(
        within(screen.getByText('Alice').closest('li') as HTMLElement).getByRole('button')
      );

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('button', { name: /merge/i })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
    });
  });

  it('A5: "+ New User" keeps the create form in the panel body under its view title', async () => {
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new user/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New User' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it("M5: opening the create form while collapsed asks the host to expand, and collapse is the host's", async () => {
    const onCollapsedChange = jest.fn();
    render(<UserManagementPanel shell={{ collapsed: false, onCollapsedChange }} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(onCollapsedChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /new user/i }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
    expect(onCollapsedChange).not.toHaveBeenCalledWith(true);
  });

  it('M5: the panel renders collapsed exactly as its host says', async () => {
    const { rerender } = render(
      <UserManagementPanel shell={{ collapsed: true, onCollapsedChange: jest.fn() }} />
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();

    rerender(<UserManagementPanel shell={{ collapsed: false, onCollapsedChange: jest.fn() }} />);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  });

  it('M5: the panel source holds no collapse state of its own', () => {
    expect(PANEL_SOURCE).not.toMatch(/usestate[^;]*collapsed/i);
    expect(PANEL_SOURCE).not.toMatch(/\[\s*collapsed\s*,\s*setCollapsed/);
  });

  it('A8: the body renders through PanelBody', () => {
    expect(PANEL_SOURCE).toMatch(/<PanelBody\b/);
    expect(PANEL_SOURCE).not.toMatch(/<LoadError\b|<EmptyState\b|<StaleNotice\b/);
  });

  it('A8: a load failure with a Retry goes through PanelBody', async () => {
    mockListUsers.mockRejectedValue(new Error('down'));
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it("twin A8: with PanelBody's load-error branch off, an empty failed load reads as empty", async () => {
    jest.spyOn(panelBodyGuards, 'showsLoadError').mockImplementation(() => false);
    mockListUsers.mockRejectedValue(new Error('down'));
    render(<UserManagementPanel />);
    await waitFor(() => expect(screen.getByText(/no users yet/i)).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('M7: no inline comments inside function bodies of the panel source', () => {
    expect(commentScanner.inFunctionBodies(PANEL_SOURCE)).toEqual([]);
  });

  it('twin M7: with the scanner off, a commented function body gets through', () => {
    const bad = 'export function f() {\n  // note\n  return 1;\n}\n';
    expect(commentScanner.inFunctionBodies(bad)).toHaveLength(1);
    jest.spyOn(commentScanner, 'inFunctionBodies').mockImplementation(() => []);
    expect(commentScanner.inFunctionBodies(bad)).toEqual([]);
  });

  it('M8: the panel directory holds only the component and its stylesheet', () => {
    expect(fileGuard.unexpected(fs.readdirSync(PANEL_DIR))).toEqual([]);
  });

  it('twin M8: with the file guard off, a stray file gets through', () => {
    expect(fileGuard.unexpected(['UserManagementPanel.tsx', 'stray.ts'])).toEqual(['stray.ts']);
    jest.spyOn(fileGuard, 'unexpected').mockImplementation(() => []);
    expect(fileGuard.unexpected(['stray.ts'])).toEqual([]);
  });

  it('shows an empty state when there are no users', async () => {
    mockListUsers.mockResolvedValue([]);
    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByText(/no users yet/i)).toBeInTheDocument());
  });

  it('announces the in-flight read as a polite live region', async () => {
    let resolveUsers!: (users: AdminUserSummary[]) => void;
    mockListUsers.mockImplementation(
      () =>
        new Promise<AdminUserSummary[]>(resolve => {
          resolveUsers = resolve;
        })
    );

    render(<UserManagementPanel />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading users…');
    expect(status).toHaveAttribute('aria-live', 'polite');

    resolveUsers(USERS);
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it('shows a load failure, NOT the empty state, when the users read throws', async () => {
    mockListUsers.mockRejectedValue(new Error('Backend unreachable'));

    render(<UserManagementPanel />);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load users/i)
    );
    expect(screen.queryByText(/no users yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Loading users…')).not.toBeInTheDocument();
  });

  it('retries the read from the failure branch and renders the list on success', async () => {
    mockListUsers.mockRejectedValueOnce(new Error('Backend unreachable'));

    render(<UserManagementPanel />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    mockListUsers.mockResolvedValue(USERS);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
