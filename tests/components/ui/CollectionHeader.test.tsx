import { render, screen } from '@testing-library/react';

import { CollectionHeader } from '@/app/components/ui/CollectionHeader/CollectionHeader';

describe('CollectionHeader', () => {
  it('renders the title as an h1', () => {
    render(<CollectionHeader title="Iceland" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Iceland' })).toBeInTheDocument();
  });

  it('renders a pluralized photo count when count is given', () => {
    render(<CollectionHeader title="Iceland" count={3} />);
    expect(screen.getByText('3 photos')).toBeInTheDocument();
  });

  it('uses the singular form for a count of 1', () => {
    render(<CollectionHeader title="Iceland" count={1} />);
    expect(screen.getByText('1 photo')).toBeInTheDocument();
  });

  it('omits the count entirely when undefined', () => {
    render(<CollectionHeader title="Iceland" />);
    expect(screen.queryByText(/photo/)).not.toBeInTheDocument();
  });

  it('renders a cover image with the title as alt when cover is given', () => {
    render(<CollectionHeader title="Iceland" cover={{ src: 'https://cdn/x.jpg' }} />);
    expect(screen.getByRole('img', { name: 'Iceland' })).toBeInTheDocument();
  });

  it('renders the breadcrumb slot before the heading', () => {
    render(<CollectionHeader title="Iceland" breadcrumb={<a href="/">Home</a>} />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });
});
