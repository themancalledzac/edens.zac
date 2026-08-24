import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ListPanel, ListRow, ListRows, ViewAllLink } from '@/app/components/ListPanel/ListPanel';

/**
 * The shell contract, inherited from `AdminPanel` when this component replaced it.
 *
 * These are that primitive's own tests, moved rather than rewritten: they cover behaviour
 * `ListPanel` still owns -- the opt-in collapse, the action staying outside the toggle, the
 * collapsed sliver being an `::after` and not markup -- and deleting them alongside the file would
 * have dropped the coverage while the behaviour stayed. `action` is now `headerRight`, which is
 * the only substantive change; the assertions themselves are unchanged.
 */
describe('ListPanel shell', () => {
  it('renders the title', () => {
    render(<ListPanel title="Users">content</ListPanel>);
    expect(screen.getByRole('heading', { name: 'Users', level: 2 })).toBeInTheDocument();
  });

  it('renders the header action', () => {
    render(
      <ListPanel title="Users" headerRight={<button type="button">+ New User</button>}>
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
        headerRight={<button type="button">+ New User</button>}
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
        headerRight={<button type="button">+ New</button>}
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
        headerRight={
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

  /**
   * The header and a row must present the SAME three sections in the same order, because that is
   * what puts a header action and a row action on one rail.
   *
   * Structure rather than computed style: `next/jest` stubs CSS modules, so nothing in this
   * environment has a `grid-template-columns` to compare -- an assertion that two elements'
   * computed grids match would read `'' === ''` and pass no matter what the stylesheet said. The
   * grid definitions themselves are compared against the real SCSS in `subtreeRules.test.ts`;
   * what belongs here is that both ends actually emit three section boxes for those tracks to
   * place, since a slot dropped from the markup moves the rail just as surely.
   */
  it('gives the header and a row the same three sections in the same order', () => {
    const { container } = render(
      <ListPanel
        title="Users"
        headerRight={<button type="button">+ New</button>}
        collapsed={false}
        onCollapsedChange={() => {}}
      >
        <ListRows>
          <ListRow left={<span>name</span>} right={<button type="button">Update</button>} />
        </ListRows>
      </ListPanel>
    );
    const sectionClasses = (el: Element) => [...el.children].map(c => c.className.split(' ')[0]);

    const header = container.querySelector('div.header');
    const row = container.querySelector('li');
    expect(header).toBeTruthy();
    expect(row).toBeTruthy();

    expect(sectionClasses(header as Element)).toEqual(['title', 'headerMiddle', 'headerRight']);
    expect(sectionClasses(row as Element)).toEqual(['rowLeft', 'rowMiddle', 'rowRight']);
  });

  it('renders a middle slot when given one', () => {
    render(
      <ListPanel
        title="Users"
        headerMiddle={<label>Show people</label>}
        collapsed={false}
        onCollapsedChange={() => {}}
      >
        <p>body</p>
      </ListPanel>
    );
    expect(screen.getByText('Show people')).toBeInTheDocument();
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
 * The header's trailing "N · View all" link, hoisted here out of CollectionsPanel and
 * MessagesPanel. Each carried a byte-identical `.viewAll` rule and the same five lines of JSX,
 * the second under a comment saying it was copying the first.
 */
describe('ViewAllLink', () => {
  it('links to the full list', () => {
    render(<ViewAllLink href="/collections" count={12} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/collections');
  });

  /**
   * The count leads and the label follows, separated by a middle dot. Asserted as one string rather
   * than two `getByText` calls: the order is the reason the component exists — the two panels sit
   * side by side on the hub and their headers align on that separator.
   */
  it('reads as the count, then the separator, then the label', () => {
    render(<ViewAllLink href="/comments" count={7} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveTextContent('7 · View all');
  });

  it('renders a zero count rather than hiding it', () => {
    render(<ViewAllLink href="/comments" count={0} />);
    expect(screen.getByRole('link', { name: /view all/i })).toHaveTextContent('0 · View all');
  });

  it('sits in the header when a panel passes it as headerRight', () => {
    render(
      <ListPanel title="Collections" headerRight={<ViewAllLink href="/collections" count={3} />}>
        body
      </ListPanel>
    );
    expect(screen.getByRole('link', { name: /view all/i })).toHaveTextContent('3 · View all');
  });
});
