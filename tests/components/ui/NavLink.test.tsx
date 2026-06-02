import { render, screen } from '@testing-library/react';

import { NavLink } from '@/app/components/ui/NavLink/NavLink';

describe('NavLink', () => {
  it('renders a real anchor with the href', () => {
    render(<NavLink href="/all-collections">Browse all work</NavLink>);
    const link = screen.getByRole('link', { name: 'Browse all work' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/all-collections');
  });

  it('applies its own class plus any passed className', () => {
    render(
      <NavLink href="/about" className="extra">
        About
      </NavLink>
    );
    const link = screen.getByRole('link', { name: 'About' });
    expect(link.className).toMatch(/navLink/);
    expect(link.className).toMatch(/extra/);
  });
});
