import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import { Footer } from '@/app/components/Footer/Footer';

describe('Footer', () => {
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

  it('is not a nav surface — links only to socials, no internal routes', () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href'));
    expect(hrefs).toEqual([
      'https://instagram.com/themancalledzac',
      'https://github.com/themancalledzac',
    ]);
  });
});
