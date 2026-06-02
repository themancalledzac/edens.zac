import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { Breadcrumb } from '@/app/components/Breadcrumb/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders links for items with href and plain text for the current item', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'Explore', href: '/explore' },
          { label: 'People', href: '/explore#people' },
          { label: 'Jane Doe' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute('href', '/explore');
    expect(screen.getByRole('link', { name: 'People' })).toHaveAttribute('href', '/explore#people');
    // current item is not a link
    expect(screen.queryByRole('link', { name: 'Jane Doe' })).not.toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('marks the last crumb as the current page with aria-current="page"', () => {
    render(<Breadcrumb items={[{ label: 'Explore', href: '/explore' }, { label: 'Jane Doe' }]} />);
    const current = screen.getByText('Jane Doe');
    expect(current).toHaveAttribute('aria-current', 'page');
    // the linked parent crumb is NOT marked current
    expect(screen.getByRole('link', { name: 'Explore' })).not.toHaveAttribute('aria-current');
  });

  it('exposes a labelled Breadcrumb navigation landmark', () => {
    render(<Breadcrumb items={[{ label: 'Explore', href: '/explore' }, { label: 'Jane Doe' }]} />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('renders nothing when given no items', () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
