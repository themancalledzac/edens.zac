import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { Footer } from '@/app/components/Footer/Footer';

describe('Footer', () => {
  it('renders crawlable internal links to Home and Explore', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('href', '/explore');
  });

  it('renders external social links with target and rel="noopener noreferrer"', () => {
    render(<Footer />);

    const instagram = screen.getByRole('link', { name: /instagram/i });
    expect(instagram).toHaveAttribute('href', 'https://instagram.com/themancalledzac');
    expect(instagram).toHaveAttribute('target', '_blank');
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer');

    const github = screen.getByRole('link', { name: /github/i });
    expect(github).toHaveAttribute('href', 'https://github.com/themancalledzac');
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not link the admin-gated /all-collections or /all-images routes', () => {
    render(<Footer />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).not.toContain('/all-collections');
    expect(hrefs).not.toContain('/all-images');
  });
});
