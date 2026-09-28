import '@testing-library/jest-dom';

import { act, fireEvent, render, screen } from '@testing-library/react';

import { AdminLists } from '@/app/components/AdminLists/AdminLists';
import { type ListPanelShell } from '@/app/components/ListPanel/ListPanel';

let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

/** Each tab's panel, stubbed to expose the shell it was handed. */
function panelStub(label: string) {
  return function Stub({ shell }: { shell: ListPanelShell }) {
    return (
      <div data-testid="panel">
        {label}
        <span data-testid="active">{shell.tabs?.active}</span>
        <span data-testid="collapsed">{String(shell.collapsed)}</span>
        <button type="button" onClick={() => shell.tabs?.onChange('roles')}>
          choose roles
        </button>
      </div>
    );
  };
}

jest.mock('@/app/components/UserManagementPanel/UserManagementPanel', () => ({
  __esModule: true,
  default: panelStub('Users panel'),
}));
jest.mock('@/app/components/MessagesPanel/MessagesPanel', () => ({
  MessagesPanel: panelStub('Messages panel'),
}));
jest.mock('@/app/components/RolesPanel/RolesPanel', () => ({
  RolesPanel: panelStub('Roles panel'),
}));
jest.mock('@/app/components/CollectionsPanel/CollectionsPanel', () => ({
  CollectionsPanel: panelStub('Collections panel'),
}));

describe('AdminLists', () => {
  let replaceState: jest.SpyInstance;

  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    window.history.replaceState(null, '', '/admin');
    replaceState = jest.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceState.mockRestore();
  });

  it('shows the Users tab by default', () => {
    render(<AdminLists />);
    expect(screen.getByTestId('panel')).toHaveTextContent('Users panel');
    expect(screen.getByTestId('active')).toHaveTextContent('users');
  });

  it.each([
    ['?list=messages', 'Messages panel'],
    ['?list=collections', 'Collections panel'],
    ['?role=7', 'Roles panel'],
    ['?list=users&role=7', 'Users panel'],
    ['?list=bogus', 'Users panel'],
  ])('mounts only the tab %s names', (search, label) => {
    mockSearchParams = new URLSearchParams(search);
    render(<AdminLists />);
    expect(screen.getAllByTestId('panel')).toHaveLength(1);
    expect(screen.getByTestId('panel')).toHaveTextContent(label);
  });

  /**
   * A tab click writes the URL without a navigation, so the force-dynamic page does not re-run its
   * server fetches. It also drops `?role=`, which would otherwise reopen that role on Roles.
   */
  it('writes the chosen tab to the URL with replaceState, dropping ?role=', () => {
    window.history.replaceState(null, '', '/admin?tab=admin&role=7');
    render(<AdminLists />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'choose roles' }));
    });
    expect(replaceState).toHaveBeenLastCalledWith(null, '', '/admin?tab=admin&list=roles');
  });

  it('hands the collapse state through to the panel', () => {
    render(<AdminLists collapsed onCollapsedChange={() => {}} />);
    expect(screen.getByTestId('collapsed')).toHaveTextContent('true');
  });
});
