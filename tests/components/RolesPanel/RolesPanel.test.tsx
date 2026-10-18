/**
 * Tests for RolesPanel — the admin Roles tab: a one-line row per role, a ListDetailSheet holding
 * RoleDetailView for the open role, and a create form that stays in the panel body.
 *
 * Mocks the roles API. The sheet mounts RoleDetailView, so the collections and users APIs it reads
 * on mount are stubbed to empty arrays. The list endpoint returns `RoleSummary` (id and name only),
 * so the counts on a row can only come from `getRole`; the list fixtures carry no counts.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AdminPanelSeedProvider } from '@/app/components/ListPanel/AdminPanelSeedContext';
import * as listPanelModule from '@/app/components/ListPanel/ListPanel';
import { panelBodyGuards } from '@/app/components/ListPanel/PanelBody';
import { RolesPanel } from '@/app/components/RolesPanel/RolesPanel';
import { clearCachedPanelData } from '@/app/hooks/useCachedPanelData';
import { ApiError } from '@/app/lib/api/core';
import * as rolesApi from '@/app/lib/api/roles';
import { type RoleDetail, type RoleSummary } from '@/app/types/Role';

jest.mock('@/app/lib/api/roles', () => ({
  listRoles: jest.fn(),
  createRole: jest.fn(),
  deleteRole: jest.fn(),
  getRole: jest.fn(),
  // The rest of RoleDetailView's surface. `jest.fn(() => Promise.resolve())` rather than
  // `jest.fn().mockResolvedValue(undefined)`: unicorn/no-useless-undefined strips the argument and
  // the bare `mockResolvedValue()` then fails to type-check against `Promise<void>`.
  setRoleGrant: jest.fn(() => Promise.resolve()),
  removeRoleGrant: jest.fn(() => Promise.resolve()),
  addRoleMember: jest.fn(() => Promise.resolve()),
  removeRoleMember: jest.fn(() => Promise.resolve()),
}));

// Reassigned per test to drive the ?role= deep link. Read lazily inside the hook, so the TDZ on
// this `let` is never reached: the factory runs at import time, the arrow only during render.
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/app/lib/api/collections', () => ({
  getAllCollectionsAdmin: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/app/lib/api/users', () => ({
  listUsers: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@/app/components/ListPanel/ListPanel', () => {
  const actual = jest.requireActual<typeof listPanelModule>('@/app/components/ListPanel/ListPanel');
  return { ...actual, ListRow: jest.fn(actual.ListRow) };
});

const mockListRoles = rolesApi.listRoles as jest.MockedFunction<typeof rolesApi.listRoles>;
const mockCreateRole = rolesApi.createRole as jest.MockedFunction<typeof rolesApi.createRole>;
const mockDeleteRole = rolesApi.deleteRole as jest.MockedFunction<typeof rolesApi.deleteRole>;
const mockGetRole = rolesApi.getRole as jest.MockedFunction<typeof rolesApi.getRole>;

const REPO_ROOT = path.resolve(__dirname, '../../..');
const PANEL_SOURCE = 'app/components/RolesPanel/RolesPanel.tsx';
const PANEL_SOURCES = [PANEL_SOURCE];

const COUNTS: Record<number, { memberCount: number; collectionCount: number }> = {
  1: { memberCount: 2, collectionCount: 1 },
  2: { memberCount: 1, collectionCount: 0 },
  3: { memberCount: 0, collectionCount: 3 },
};

const NAMES: Record<number, string> = { 1: 'alpha', 2: 'zeta', 3: 'Beta' };

// Deliberately unsorted, and deliberately mixed-case: a plain ASCII sort would put "Beta" first,
// so this fixture is what distinguishes the case-insensitive comparison from a naive one. No
// counts here: the real list payload has none.
const ROLES: RoleSummary[] = [2, 1, 3].map(id => ({ id, name: NAMES[id] ?? '' }));

const detailFor = (id: number): RoleDetail => ({
  id,
  name: NAMES[id] ?? `role-${id}`,
  members: Array.from({ length: COUNTS[id]?.memberCount ?? 0 }, (_, i) => ({
    userId: 100 + i,
    email: `user${i}@example.com`,
    name: `User ${i}`,
  })),
  collections: Array.from({ length: COUNTS[id]?.collectionCount ?? 0 }, (_, i) => ({
    collectionId: 200 + i,
    title: `Collection ${i}`,
    level: 'GENERAL' as RoleDetail['collections'][number]['level'],
  })),
});

const rowFor = (name: string) =>
  screen.getAllByRole('listitem').find(li => li.textContent?.includes(name)) as HTMLElement;

const sourceOf = (relative: string) => readFileSync(path.join(REPO_ROOT, relative), 'utf8');

const bodyLines = (source: string) =>
  source.split('\n').filter(line => /^\s{2,}\S/.test(line) && /^\s*(\/\/|{\/\*)/.test(line));

const stateOwners = (source: string) =>
  source.match(/useState\([^)]*\)/g)?.filter(() => /\[\s*collapsed\b/.test(source)) ?? [];

describe('RolesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedPanelData();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/admin');
    window.confirm = jest.fn(() => true);
    mockSearchParams = new URLSearchParams();
    mockListRoles.mockResolvedValue(ROLES);
    mockGetRole.mockImplementation(id => Promise.resolve(detailFor(id)));
  });

  /**
   * The body is built inside `if (!loading)`, so a refresh that enters the loading state blanks
   * the list. After a successful create the list on screen is still correct — reconcile it
   * underneath rather than flashing "Loading roles…" over it.
   */
  it('does not blank the list while a post-create refresh is in flight', async () => {
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: 'delta' } });
    mockListRoles.mockReturnValueOnce(new Promise<RoleSummary[]>(() => {}));
    fireEvent.click(screen.getByRole('button', { name: /create role/i }));

    await waitFor(() => expect(mockCreateRole).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
    expect(screen.queryByText('Loading roles…')).not.toBeInTheDocument();
  });

  /**
   * The other half of the same trade: quiet over a correct list, loud when the refresh fails. A
   * create that succeeded but whose list refresh then failed must not read as a create that did
   * nothing — and the Retry it offers has to work with a warm cache behind it.
   */
  it('surfaces a failed post-create refresh and recovers through Retry', async () => {
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new role/i }));
    fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: 'delta' } });
    mockListRoles.mockRejectedValueOnce(new ApiError('Backend unreachable', 500));
    fireEvent.click(screen.getByRole('button', { name: /create role/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load roles/i)
    );

    mockListRoles.mockResolvedValueOnce([...ROLES, { id: 4, name: 'delta' }]);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('delta')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * The hub fetches this list server-side to size the panel, and passes it down as the cache seed.
   * "Painted on the first commit" is the assertion that distinguishes a seed from a fast fetch:
   * nothing awaited here, so a list on screen cannot have come from `listRoles`. The revalidation
   * behind it still runs — a seed is a warm start, not a replacement for reconciling.
   */
  it('paints the server seed synchronously and revalidates behind it', async () => {
    mockListRoles.mockResolvedValue([...ROLES, { id: 4, name: 'delta' }]);
    render(
      <AdminPanelSeedProvider value={{ roles: ROLES }}>
        <RolesPanel />
      </AdminPanelSeedProvider>
    );

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.queryByText('Loading roles…')).not.toBeInTheDocument();
    expect(screen.queryByText('delta')).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('delta')).toBeInTheDocument());
    expect(mockListRoles).toHaveBeenCalledTimes(1);
  });

  it('renders roles alphabetically, case-insensitively', async () => {
    render(<RolesPanel />);
    await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('alpha');
    expect(rows[1]).toHaveTextContent('Beta');
    expect(rows[2]).toHaveTextContent('zeta');
  });

  describe('A4: the one-line role row', () => {
    it('A4: shows the name, then the member and collection counts after a middle dot', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      await waitFor(() =>
        expect(rowFor('alpha')).toHaveTextContent(/alpha\s*·\s*2 members\s*·\s*1 collections?/)
      );
      expect(rowFor('Beta')).toHaveTextContent(/Beta\s*·\s*0 members\s*·\s*3 collections/);
      expect(rowFor('zeta')).toHaveTextContent(/zeta\s*·\s*1 members?\s*·\s*0 collections/);
    });

    it('A4: the row is a ListRow in its one-line form with a muted secondary and no fact', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
      await waitFor(() => expect(rowFor('alpha')).toHaveTextContent(/members/));

      const calls = jest.mocked(listPanelModule.ListRow).mock.calls.map(([props]) => props);
      const alpha = calls.findLast(props => props.primary === 'alpha');
      expect(alpha).toBeDefined();
      expect(alpha?.secondary).toBeTruthy();
      expect(alpha?.fact).toBeUndefined();
      expect(alpha?.onActivate).toEqual(expect.any(Function));
    });

    it('A4: the row itself is the only clickable element', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      for (const li of screen.getAllByRole('listitem')) {
        expect(within(li).getAllByRole('button')).toHaveLength(1);
        expect(within(li).queryByRole('link')).not.toBeInTheDocument();
      }
    });
  });

  /**
   * Roles lost their own routes when they moved onto the hub, so `?role=` is the only thing keeping
   * a role addressable — it is what UserRolesSection links a user's role names to. Without it those
   * links land on the list and the reader has to find the role again by hand.
   */
  describe('A5: the detail sheet', () => {
    it('A5: tapping a row opens a sheet holding RoleDetailView with its delete', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(within(rowFor('alpha')).getByRole('button'));

      const dialog = await screen.findByRole('dialog', { name: 'alpha' });
      expect(mockGetRole).toHaveBeenCalledWith(1);
      expect(
        await within(dialog).findByRole('heading', { name: 'Collections' })
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: /delete role/i })).toBeInTheDocument();
    });

    it('A5: the panel list stays in place beneath the open sheet', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(within(rowFor('alpha')).getByRole('button'));
      await screen.findByRole('dialog', { name: 'alpha' });

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('A5: loading ?role=[id] opens that role in a sheet', async () => {
      mockSearchParams = new URLSearchParams('role=3');

      render(<RolesPanel />);

      const dialog = await screen.findByRole('dialog', { name: 'Beta' });
      expect(mockGetRole).toHaveBeenCalledWith(3);
      expect(
        await within(dialog).findByRole('heading', { name: 'Collections' })
      ).toBeInTheDocument();
    });

    it('A5: deleting from the sheet confirms, deletes and closes the sheet', async () => {
      mockDeleteRole.mockResolvedValue();
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(within(rowFor('alpha')).getByRole('button'));
      const dialog = await screen.findByRole('dialog', { name: 'alpha' });
      fireEvent.click(await within(dialog).findByRole('button', { name: /delete role/i }));

      await waitFor(() => expect(mockDeleteRole).toHaveBeenCalledWith(1));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('A5: closing the sheet drops ?role= from the URL with history.replaceState', async () => {
      window.history.replaceState(null, '', '/admin?role=1&keep=yes');
      mockSearchParams = new URLSearchParams('role=1&keep=yes');
      const replaceState = jest.spyOn(window.history, 'replaceState');

      render(<RolesPanel />);
      await screen.findByRole('dialog', { name: 'alpha' });
      replaceState.mockClear();

      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(replaceState).toHaveBeenCalled();
      expect(window.location.search).not.toContain('role=');
      expect(window.location.search).toContain('keep=yes');
      replaceState.mockRestore();
    });

    it('A5: closing a sheet opened by tapping leaves the list on screen', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(within(rowFor('alpha')).getByRole('button'));
      await screen.findByRole('dialog', { name: 'alpha' });
      fireEvent.click(screen.getByRole('button', { name: /close/i }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('A5: a ?role= id that matches no role opens no sheet', async () => {
      mockSearchParams = new URLSearchParams('role=404');

      render(<RolesPanel />);

      await waitFor(() => expect(rowFor('alpha')).toHaveTextContent(/2 members/));
      expect(mockGetRole).not.toHaveBeenCalledWith(404);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('A5: a non-numeric ?role= opens nothing', async () => {
      mockSearchParams = new URLSearchParams('role=not-a-number');

      render(<RolesPanel />);

      await waitFor(() => expect(rowFor('alpha')).toHaveTextContent(/2 members/));
      expect(mockGetRole).not.toHaveBeenCalledWith(Number.NaN);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('create form', () => {
    it('"+ New Role" opens the create form in the body under its title; Cancel returns', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /new role/i }));
      expect(screen.getByRole('heading', { name: 'New Role' })).toBeInTheDocument();
      expect(screen.getByLabelText(/new role name/i)).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() =>
        expect(screen.queryByLabelText(/new role name/i)).not.toBeInTheDocument()
      );
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    it('creates a role with the trimmed name and returns to the list', async () => {
      mockCreateRole.mockResolvedValue({ id: 4, name: 'power' });
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /new role/i }));
      fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: '  power  ' } });
      fireEvent.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() => expect(mockCreateRole).toHaveBeenCalledWith({ name: 'power' }));
      await waitFor(() =>
        expect(screen.queryByLabelText(/new role name/i)).not.toBeInTheDocument()
      );
      expect(mockListRoles).toHaveBeenCalledTimes(2);
    });

    /**
     * The backend answers a duplicate name with 409. Anything else is a generic failure, so the
     * status is what has to be read — not the message text.
     */
    it('surfaces a 409 duplicate name as "A role with that name already exists."', async () => {
      mockCreateRole.mockRejectedValue(new ApiError('Conflict', 409));
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /new role/i }));
      fireEvent.change(screen.getByLabelText(/new role name/i), { target: { value: 'alpha' } });
      fireEvent.click(screen.getByRole('button', { name: /create role/i }));

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent('A role with that name already exists.')
      );
      expect(screen.getByRole('heading', { name: 'New Role' })).toBeInTheDocument();
    });
  });

  describe('A8: states render through PanelBody', () => {
    /**
     * The live region has to predate the text it announces, so the panel renders it outside the body
     * branch. Node identity across the transition is what proves it was not inserted mid-flight.
     */
    it('A8: loading is announced through one status region that outlives the load', async () => {
      let resolveRoles!: (roles: RoleSummary[]) => void;
      mockListRoles.mockImplementation(
        () =>
          new Promise<RoleSummary[]>(resolve => {
            resolveRoles = resolve;
          })
      );

      render(<RolesPanel />);

      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('Loading roles…');

      resolveRoles([]);
      await waitFor(() => expect(screen.getByText(/no roles yet/i)).toBeInTheDocument());
      expect(screen.getByRole('status')).toBe(status);
    });

    it('A8: an empty list shows the empty state', async () => {
      mockListRoles.mockResolvedValue([]);
      render(<RolesPanel />);

      await waitFor(() => expect(screen.getByText(/no roles yet/i)).toBeInTheDocument());
    });

    /**
     * `listRoles` throws on any non-OK response, so a catch-less refresh would leave `roles` at []
     * and tell an admin whose backend is down that there are no roles — inviting a duplicate.
     */
    it('A8: a failed read shows the load error with Retry, not the empty state', async () => {
      mockListRoles.mockRejectedValue(new Error('Backend unreachable'));
      render(<RolesPanel />);

      await waitFor(() =>
        expect(screen.getByRole('alert')).toHaveTextContent(/could not load roles/i)
      );
      expect(screen.queryByText(/no roles yet/i)).not.toBeInTheDocument();
    });

    it('A8: Retry re-reads and renders the list', async () => {
      mockListRoles.mockRejectedValueOnce(new Error('Backend unreachable'));
      render(<RolesPanel />);

      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
      expect(mockListRoles).toHaveBeenCalledTimes(2);
    });

    /**
     * A warm cache turns a dead backend into a silent one: the list paints from localStorage, the
     * background revalidation fails, and nothing on screen says the roles are last session's. The
     * notice is the only thing standing between "cached" and "current".
     */
    it('A8: a failed background refresh keeps the list and says it is cached', async () => {
      const warm = render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());
      warm.unmount();

      mockListRoles.mockRejectedValueOnce(new ApiError('Backend unreachable', 500));
      render(<RolesPanel />);

      await waitFor(() => expect(screen.getByText(/showing cached data/i)).toBeInTheDocument());
      expect(screen.getByText('alpha')).toBeInTheDocument();
    });

    it('A8: the panel body is PanelBody — its error branch guard decides the load error', async () => {
      mockListRoles.mockRejectedValue(new Error('Backend unreachable'));
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
      expect(screen.queryByText(/no roles yet/i)).not.toBeInTheDocument();
    });

    it('twin A8: with the load-error guard off, a failed read shows the empty state, not the alert', async () => {
      const spy = jest.spyOn(panelBodyGuards, 'showsLoadError').mockReturnValue(false);
      mockListRoles.mockRejectedValue(new Error('Backend unreachable'));
      render(<RolesPanel />);

      await waitFor(() => expect(screen.getByText(/no roles yet/i)).toBeInTheDocument());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      spy.mockRestore();
    });

    it('A8: the panel source renders through PanelBody and no longer assembles the states itself', () => {
      const source = sourceOf(PANEL_SOURCE);
      expect(source).toMatch(/<PanelBody\b/);
      expect(source).not.toMatch(/<LoadError\b/);
      expect(source).not.toMatch(/<EmptyState\b/);
      expect(source).not.toMatch(/<StaleNotice\b/);
    });
  });

  describe('S1: no delete button on a role row', () => {
    const rowDeleteButtons = () =>
      screen
        .getAllByRole('listitem')
        .flatMap(li => within(li).queryAllByRole('button', { name: /delete/i }));

    it('S1: no role row renders a delete button', async () => {
      render(<RolesPanel />);
      await waitFor(() => expect(screen.getByText('alpha')).toBeInTheDocument());

      expect(screen.getAllByRole('listitem')).toHaveLength(3);
      expect(rowDeleteButtons()).toHaveLength(0);
      expect(screen.queryByRole('button', { name: 'Delete role alpha' })).not.toBeInTheDocument();
      expect(screen.queryByText('×')).not.toBeInTheDocument();
    });

    it('twin S1: when the row renderer adds a delete control, the same check sees it', async () => {
      const actual = jest.requireActual<typeof listPanelModule>(
        '@/app/components/ListPanel/ListPanel'
      );
      jest.mocked(listPanelModule.ListRow).mockImplementation(props => (
        <li>
          <button type="button" onClick={props.onActivate}>
            {props.primary}
          </button>
          <button type="button" aria-label="Delete role">
            ×
          </button>
        </li>
      ));
      expect(actual.ListRow).toBeDefined();

      render(<RolesPanel />);
      await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(3));

      expect(rowDeleteButtons().length).toBeGreaterThan(0);
      jest.mocked(listPanelModule.ListRow).mockImplementation(actual.ListRow);
    });
  });

  describe('M5: collapse state stays in the host', () => {
    it('M5: opening the create form while collapsed asks the host to expand', async () => {
      const onCollapsedChange = jest.fn();
      render(<RolesPanel shell={{ collapsed: true, onCollapsedChange }} />);

      fireEvent.click(screen.getByRole('button', { name: /new role/i }));

      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });

    it('M5: the panel source holds no collapse state of its own', () => {
      const source = sourceOf(PANEL_SOURCE);
      expect(stateOwners(source)).toHaveLength(0);
      expect(source).not.toMatch(/\[\s*(collapsed|isCollapsed)\s*,/);
    });

    it('twin M5: a panel source that owns collapse state is detected as doing so', () => {
      const bad = `${sourceOf(PANEL_SOURCE)}\nconst [collapsed, setCollapsed] = useState(false);\n`;
      expect(stateOwners(bad).length).toBeGreaterThan(0);
    });
  });

  describe('M7: no inline comments inside function bodies', () => {
    it.each(PANEL_SOURCES)('M7: %s has no inline comment lines in a body', relative => {
      expect(bodyLines(sourceOf(relative))).toEqual([]);
    });

    it('twin M7: the scan flags a source that has an inline comment in a body', () => {
      const bad = 'export function A() {\n  // why\n  return null;\n}\n';
      expect(bodyLines(bad)).toEqual(['  // why']);
      const jsx =
        'export function A() {\n  return (\n    <div>\n      {/* why */}\n    </div>\n  );\n}\n';
      expect(bodyLines(jsx)).toHaveLength(1);
    });
  });
});
