import { render, screen } from '@testing-library/react';

import { Badge, collectionPublicLabel } from '@/app/components/ui/Badge/Badge';

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge label="2024" />);
    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('applies tone and position classes', () => {
    render(<Badge label="x" tone="card" position="start" />);
    const el = screen.getByText('x');
    expect(el.className).toMatch(/card/);
    expect(el.className).toMatch(/start/);
  });

  it('renders nothing when label is null', () => {
    const { container } = render(<Badge label={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('collectionPublicLabel', () => {
  it('labels a blog collection "Story"', () => {
    expect(collectionPublicLabel({ isBlog: true })).toBe('Story');
  });

  it('labels an art-gallery-tagged collection "Gallery" (tag models with slug)', () => {
    expect(collectionPublicLabel({ tags: [{ slug: 'landscape' }, { slug: 'art-gallery' }] })).toBe(
      'Gallery'
    );
  });

  it('labels an art-gallery-tagged collection "Gallery" (raw string tags)', () => {
    expect(collectionPublicLabel({ tags: ['landscape', 'art-gallery'] })).toBe('Gallery');
  });

  it('normalizes raw tag NAMES to slugs before lookup (CollectionModel.tags shape)', () => {
    expect(collectionPublicLabel({ tags: ['Landscape', 'Art Gallery'] })).toBe('Gallery');
  });

  it('prefers "Story" when a blog also carries the art-gallery tag', () => {
    expect(collectionPublicLabel({ isBlog: true, tags: [{ slug: 'art-gallery' }] })).toBe('Story');
  });

  it('returns null for collections with no badge-worthy fields', () => {
    expect(collectionPublicLabel({})).toBeNull();
    expect(collectionPublicLabel({ isBlog: false })).toBeNull();
    expect(collectionPublicLabel({ tags: [] })).toBeNull();
    expect(collectionPublicLabel({ tags: [{ slug: 'weddings' }, 'travel'] })).toBeNull();
  });
});
