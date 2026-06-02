import { render, screen } from '@testing-library/react';

import { Badge, collectionTypeToPublicLabel } from '@/app/components/ui/Badge/Badge';
import { CollectionType } from '@/app/types/Collection';

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

describe('collectionTypeToPublicLabel', () => {
  it('maps public types to curated labels', () => {
    expect(collectionTypeToPublicLabel(CollectionType.ART_GALLERY)).toBe('Gallery');
    expect(collectionTypeToPublicLabel(CollectionType.BLOG)).toBe('Story');
  });

  it('suppresses internal types (PARENT, PORTFOLIO, HOME, CLIENT_GALLERY, MISC)', () => {
    expect(collectionTypeToPublicLabel(CollectionType.PARENT)).toBeNull();
    expect(collectionTypeToPublicLabel(CollectionType.PORTFOLIO)).toBeNull();
    expect(collectionTypeToPublicLabel(CollectionType.HOME)).toBeNull();
    expect(collectionTypeToPublicLabel(CollectionType.CLIENT_GALLERY)).toBeNull();
    expect(collectionTypeToPublicLabel(CollectionType.MISC)).toBeNull();
  });
});
