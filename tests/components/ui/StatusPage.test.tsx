import { fireEvent, render, screen } from '@testing-library/react';

import { StatusPage } from '@/app/components/ui/StatusPage/StatusPage';

jest.mock('@/app/components/SiteHeader/SiteHeader', () => ({
  __esModule: true,
  default: () => <div data-testid="site-header" />,
  SiteHeader: () => <div data-testid="site-header" />,
}));

describe('StatusPage', () => {
  it('renders the title as an h1 and the message', () => {
    render(<StatusPage title="404 — Not Found" message="That page doesn't exist." />);
    expect(screen.getByRole('heading', { level: 1, name: '404 — Not Found' })).toBeInTheDocument();
    expect(screen.getByText("That page doesn't exist.")).toBeInTheDocument();
  });

  it('renders a home link by default', () => {
    render(<StatusPage title="404" message="m" />);
    const home = screen.getByRole('link', { name: /home/i });
    expect(home).toHaveAttribute('href', '/');
  });

  it('renders a retry button (type=button) when onRetry is provided and calls it', () => {
    const onRetry = jest.fn();
    render(<StatusPage title="Error" message="m" onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /try again/i });
    expect(btn).toHaveAttribute('type', 'button');
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render a retry button when onRetry is omitted', () => {
    render(<StatusPage title="404" message="m" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the detail line when provided', () => {
    render(<StatusPage title="Error" message="m" detail="Error ID: abc123" />);
    expect(screen.getByText('Error ID: abc123')).toBeInTheDocument();
  });
});
