import { fireEvent, render, screen } from '@testing-library/react';

import { AdminPanel } from '@/app/components/AdminPanel/AdminPanel';

describe('AdminPanel', () => {
  it('renders the title', () => {
    render(<AdminPanel title="Users">content</AdminPanel>);
    expect(screen.getByRole('heading', { name: 'Users', level: 2 })).toBeInTheDocument();
  });

  it('renders the action node in the header', () => {
    render(
      <AdminPanel title="Users" action={<button type="button">+ New User</button>}>
        content
      </AdminPanel>
    );
    expect(screen.getByRole('button', { name: '+ New User' })).toBeInTheDocument();
  });

  it('renders children in the body', () => {
    render(<AdminPanel title="Users">body content</AdminPanel>);
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('applies aria-label to the section when provided', () => {
    render(
      <AdminPanel title="Users" ariaLabel="User management">
        content
      </AdminPanel>
    );
    expect(screen.getByRole('region', { name: 'User management' })).toBeInTheDocument();
  });

  // Collapsing is opt-in, so panels that pass no handler keep exactly the old markup.
  it('gives the title no toggle button when no onCollapsedChange is passed', () => {
    render(<AdminPanel title="Users">content</AdminPanel>);
    expect(screen.queryByRole('button', { name: /users/i })).not.toBeInTheDocument();
  });
});

describe('AdminPanel — collapsible', () => {
  const renderPanel = (collapsed: boolean) => {
    const onCollapsedChange = jest.fn();
    render(
      <AdminPanel
        title="Users"
        ariaLabel="User management"
        action={<button type="button">+ New User</button>}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      >
        <p>body content</p>
      </AdminPanel>
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

  // The point of collapsing is reclaiming space, and the header is what stays behind — so the
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

  it('points aria-controls at the body it hides', () => {
    renderPanel(false);
    const id = toggle().getAttribute('aria-controls');
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toHaveTextContent('body content');
  });

  it('keeps the heading semantics — the toggle lives inside the h2', () => {
    renderPanel(false);
    const heading = screen.getByRole('heading', { name: /users/i, level: 2 });
    expect(heading.querySelector('button')).not.toBeNull();
  });
});
