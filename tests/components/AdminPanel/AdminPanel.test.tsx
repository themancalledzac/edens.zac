import { render, screen } from '@testing-library/react';

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
});
