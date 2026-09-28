import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  ListPanel,
  type ListPanelTabs,
  ListRow,
  ListRows,
  PanelAction,
  ViewAllLink,
} from '@/app/components/ListPanel/ListPanel';

/**
 * The shell contract, inherited from `AdminPanel` when this component replaced it.
 *
 * These are that primitive's own tests, moved rather than rewritten: they cover behaviour
 * `ListPanel` still owns -- the opt-in collapse, the action staying outside the toggle, the
 * collapsed sliver being an `::after` and not markup -- and deleting them alongside the file would
 * have dropped the coverage while the behaviour stayed.
 */
describe('ListPanel shell', () => {
  it('renders the title', () => {
    render(<ListPanel title="Users">content</ListPanel>);
    expect(screen.getByRole('heading', { name: 'Users', level: 2 })).toBeInTheDocument();
  });

  it('renders the header action', () => {
    render(
      <ListPanel title="Users" action={<button type="button">+ New User</button>}>
        content
      </ListPanel>
    );
    expect(screen.getByRole('button', { name: '+ New User' })).toBeInTheDocument();
  });

  it('renders children in the body', () => {
    render(<ListPanel title="Users">body content</ListPanel>);
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('applies aria-label to the section when provided', () => {
    render(
      <ListPanel title="Users" ariaLabel="User management">
        content
      </ListPanel>
    );
    expect(screen.getByRole('region', { name: 'User management' })).toBeInTheDocument();
  });

  // Collapsing is opt-in, so panels that pass no handler keep exactly the plain markup.
  it('gives the title no toggle button when no onCollapsedChange is passed', () => {
    render(<ListPanel title="Users">content</ListPanel>);
    expect(screen.queryByRole('button', { name: /users/i })).not.toBeInTheDocument();
  });
});

describe('ListPanel — collapsible', () => {
  const renderPanel = (collapsed: boolean) => {
    const onCollapsedChange = jest.fn();
    render(
      <ListPanel
        title="Users"
        ariaLabel="User management"
        action={<button type="button">+ New User</button>}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      >
        <p>body content</p>
      </ListPanel>
    );
    return onCollapsedChange;
  };

  const toggle = () => screen.getByRole('button', { name: /users/i });

  it('exposes the title as an expanded toggle when open', () => {
    renderPanel(false);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('unmounts the body when collapsed', () => {
    renderPanel(true);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('body content')).not.toBeInTheDocument();
  });

  // The point of collapsing is reclaiming space, and the header is what stays behind -- so the
  // controls it carries have to survive the collapse to remain reachable.
  it('keeps the header action usable while collapsed', () => {
    renderPanel(true);
    expect(screen.getByRole('button', { name: '+ New User' })).toBeInTheDocument();
  });

  it('requests collapse when clicked while open', () => {
    const onCollapsedChange = renderPanel(false);
    fireEvent.click(toggle());
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('requests expansion when clicked while collapsed', () => {
    const onCollapsedChange = renderPanel(true);
    fireEvent.click(toggle());
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  // The action controls sit OUTSIDE the toggle button. Nesting them would be invalid HTML, and
  // would make every "+ New User" click collapse the panel out from under the form it opens.
  it('does not toggle when a header action is clicked', () => {
    const onCollapsedChange = renderPanel(false);
    fireEvent.click(screen.getByRole('button', { name: '+ New User' }));
    expect(onCollapsedChange).not.toHaveBeenCalled();
  });

  // The strip of empty body surface a closed panel keeps showing is an `::after`, not markup. It
  // used to be two nested divs held out of the accessibility tree by an `aria-hidden` -- a guard a
  // later edit could drop. Nothing but the header may survive a collapse.
  it('adds no element for the collapsed body strip', () => {
    renderPanel(true);
    const section = screen.getByRole('region', { name: 'User management' });
    expect(section.children).toHaveLength(1);
    expect(section.children[0]).toContainElement(toggle());
  });

  it('points aria-controls at the body it hides', () => {
    renderPanel(false);
    const id = toggle().getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toHaveTextContent('body content');
  });

  it('keeps the heading semantics -- the toggle lives inside the h2', () => {
    renderPanel(false);
    const heading = screen.getByRole('heading', { name: /users/i, level: 2 });
    expect(heading.querySelector('button')).not.toBeNull();
  });
});

describe('ListPanel header', () => {
  it('the toggle is bounded to the title, not the whole bar', () => {
    render(
      <ListPanel
        title="Users"
        action={<button type="button">+ New</button>}
        collapsed={false}
        onCollapsedChange={() => {}}
      >
        <p>body</p>
      </ListPanel>
    );
    const toggle = screen.getByRole('button', { name: /users/i });
    expect(toggle).not.toHaveTextContent('+ New');
  });

  it('keeps the action outside the toggle and independently clickable', async () => {
    const onAction = jest.fn();
    const onCollapsedChange = jest.fn();
    render(
      <ListPanel
        title="Users"
        action={
          <button type="button" onClick={onAction}>
            + New
          </button>
        }
        collapsed={false}
        onCollapsedChange={onCollapsedChange}
      >
        <p>body</p>
      </ListPanel>
    );
    await userEvent.click(screen.getByRole('button', { name: '+ New' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onCollapsedChange).not.toHaveBeenCalled();
  });
});

describe('ListPanel body first line', () => {
  it('renders the toolbar above the list', () => {
    render(
      <ListPanel title="Users" toolbar={<label>Show people</label>}>
        <p>body</p>
      </ListPanel>
    );
    const toolbar = screen.getByText('Show people');
    const body = screen.getByText('body');
    expect(toolbar.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders a view title as a heading on the first line', () => {
    render(
      <ListPanel title="Users" viewTitle="New User">
        <p>form</p>
      </ListPanel>
    );
    expect(screen.getByRole('heading', { name: 'New User', level: 3 })).toBeInTheDocument();
  });

  it('renders no first line when given neither', () => {
    const { container } = render(
      <ListPanel title="Users">
        <p>body</p>
      </ListPanel>
    );
    expect(container.querySelector('.toolbar')).toBeNull();
  });
});

describe('ListPanel — tabbed', () => {
  const TABS = [
    { id: 'users', label: 'Users' },
    { id: 'messages', label: 'Messages' },
    { id: 'roles', label: 'Roles' },
  ];

  const renderTabbed = ({
    active = 'users',
    collapsed,
  }: { active?: string; collapsed?: boolean } = {}) => {
    const onChange = jest.fn();
    const onCollapsedChange = jest.fn();
    const tabs: ListPanelTabs = { tabs: TABS, active, onChange };
    render(
      <ListPanel
        title="Admin"
        ariaLabel="Admin lists"
        tabs={tabs}
        action={<PanelAction onClick={() => {}}>+ New</PanelAction>}
        {...(collapsed === undefined ? {} : { collapsed, onCollapsedChange })}
      >
        <p>body content</p>
      </ListPanel>
    );
    return { onChange, onCollapsedChange };
  };

  it('shows the tabs in place of the title', () => {
    renderTabbed();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map(t => t.textContent)).toEqual([
      'Users',
      'Messages',
      'Roles',
    ]);
    expect(screen.queryByRole('heading', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('marks only the active tab selected, and only it in the Tab order', () => {
    renderTabbed({ active: 'messages' });
    const [users, messages] = screen.getAllByRole('tab');
    expect(messages).toHaveAttribute('aria-selected', 'true');
    expect(messages).toHaveAttribute('tabindex', '0');
    expect(users).toHaveAttribute('aria-selected', 'false');
    expect(users).toHaveAttribute('tabindex', '-1');
  });

  it('labels the body by the active tab', () => {
    renderTabbed({ active: 'roles' });
    const panel = screen.getByRole('tabpanel', { name: 'Roles' });
    expect(panel).toHaveTextContent('body content');
    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-controls', panel.id);
  });

  it('reports a clicked tab', () => {
    const { onChange } = renderTabbed();
    fireEvent.click(screen.getByRole('tab', { name: 'Roles' }));
    expect(onChange).toHaveBeenCalledWith('roles');
  });

  it.each([
    ['ArrowRight', 'users', 'messages'],
    ['ArrowRight', 'roles', 'users'],
    ['ArrowLeft', 'users', 'roles'],
    ['Home', 'roles', 'users'],
    ['End', 'users', 'roles'],
  ])('moves selection with %s from %s to %s', (key, from, to) => {
    const { onChange } = renderTabbed({ active: from });
    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), { key });
    expect(onChange).toHaveBeenCalledWith(to);
  });

  it('keeps the action at the end of the header, outside the tab list', () => {
    renderTabbed();
    const action = screen.getByRole('button', { name: '+ New' });
    expect(screen.getByRole('tablist')).not.toContainElement(action);
  });

  it('keeps a chevron toggle named by the title when collapsible', () => {
    renderTabbed({ collapsed: false });
    const toggle = screen.getByRole('button', { name: 'Admin' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tablist')).not.toContainElement(toggle);
  });

  it('expands when a tab is chosen while collapsed', () => {
    const { onChange, onCollapsedChange } = renderTabbed({ collapsed: true });
    fireEvent.click(screen.getByRole('tab', { name: 'Messages' }));
    expect(onChange).toHaveBeenCalledWith('messages');
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });

  it('points no tab at the unmounted body while collapsed', () => {
    renderTabbed({ collapsed: true });
    expect(screen.queryByText('body content')).not.toBeInTheDocument();
    for (const tab of screen.getAllByRole('tab')) {
      expect(tab).not.toHaveAttribute('aria-controls');
    }
  });
});

describe('ListRow', () => {
  it('renders left and right sections', () => {
    render(<ListRow left={<span>name</span>} right={<button type="button">Update</button>} />, {
      wrapper: ListRows,
    });
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
  });

  it('is a button when activatable and static otherwise', () => {
    const { rerender } = render(
      <ListRow left={<span>a</span>} onActivate={() => {}} ariaLabel="Open a" />,
      { wrapper: ListRows }
    );
    expect(screen.getByRole('button', { name: 'Open a' })).toBeInTheDocument();
    rerender(<ListRow left={<span>a</span>} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

/**
 * The one header-action style. `+ New User`, `+ New Role` and `View all` used to be a ghost
 * Button, a filled secondary Button and a muted text link; every panel renders its action through
 * this now, so a link and a button must come out identical.
 */
describe('PanelAction', () => {
  it('renders a link when given an href', () => {
    render(<PanelAction href="/comments">View all</PanelAction>);
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/comments');
  });

  it('renders a button when given onClick', () => {
    const onClick = jest.fn();
    render(<PanelAction onClick={onClick}>+ New User</PanelAction>);
    fireEvent.click(screen.getByRole('button', { name: '+ New User' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('gives the link and the button the same class', () => {
    render(
      <>
        <PanelAction href="/comments">View all</PanelAction>
        <PanelAction onClick={() => {}}>+ New Role</PanelAction>
      </>
    );
    expect(screen.getByRole('link').className).toBe(screen.getByRole('button').className);
  });
});

/** The `N · View all` action, shared by the Collections and Messages tabs. */
describe('ViewAllLink', () => {
  it('links to the full list', () => {
    render(<ViewAllLink href="/collections" count={12} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/collections');
  });

  it('reads as the count, then the separator, then the label', () => {
    render(<ViewAllLink href="/comments" count={7} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveTextContent('7 · View all');
  });

  it('renders a zero count rather than hiding it', () => {
    render(<ViewAllLink href="/comments" count={0} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveTextContent('0 · View all');
  });

  it('is styled as a PanelAction', () => {
    render(
      <>
        <ViewAllLink href="/collections" count={3} />
        <PanelAction onClick={() => {}}>+ New</PanelAction>
      </>
    );
    expect(screen.getByRole('link').className).toBe(screen.getByRole('button').className);
  });
});
