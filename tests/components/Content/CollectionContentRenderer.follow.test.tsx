/**
 * Tests for the follow toggle rendered on collection cards by {@link CollectionContentRenderer}.
 *
 * Three things are pinned here: the toggle appears on a slug-navigating collection card inside a
 * FollowsProvider, it never appears on a plain photo block, and it disappears entirely when no
 * provider is mounted (every pre-existing surface). The fourth — that it persists
 * `followCollectionId` and NOT `contentId` — is the one that would silently follow the wrong
 * collection, since for a child-collection block `contentId` is the content-table row id.
 */
import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';
import { FollowsProvider } from '@/app/components/Personal/FollowsContext';
import { addFollow, removeFollow } from '@/app/lib/api/personal';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));
jest.mock('@/app/components/ui/FilterToolbar/FilterToolbar', () => ({
  FilterToolbar: () => null,
}));
jest.mock('@/app/components/auth/MeProvider', () => ({
  useMe: jest.fn(() => null),
}));
jest.mock('@/app/lib/api/personal', () => ({
  addFollow: jest.fn(),
  removeFollow: jest.fn(),
}));

beforeEach(() => {
  (addFollow as jest.Mock).mockImplementation(() => Promise.resolve());
  (removeFollow as jest.Mock).mockImplementation(() => Promise.resolve());
});

afterEach(() => {
  jest.clearAllMocks();
});

function withFollows(ui: ReactNode, initialFollowedIds: number[] = []) {
  return render(<FollowsProvider initialFollowedIds={initialFollowedIds}>{ui}</FollowsProvider>);
}

/**
 * A collection card as it reaches the renderer: `convertCollectionContentToParallax` turns the
 * block into a parallax IMAGE carrying a slug, so `contentId` is the content-table row (7) while
 * `followCollectionId` is the collection itself (301).
 */
const collectionCardProps = {
  contentId: 7,
  className: 'imageSingle',
  width: 300,
  height: 200,
  isMobile: false,
  imageUrl: 'https://cdn.example/cover.jpg',
  imageWidth: 300,
  imageHeight: 200,
  alt: 'Dolomites',
  enableParallax: true,
  contentType: 'IMAGE' as const,
  hasSlug: 'dolomites-2025',
  overlayText: 'Dolomites',
  followCollectionId: 301,
};

const photoProps = {
  contentId: 12,
  className: 'imageSingle',
  width: 300,
  height: 200,
  isMobile: false,
  imageUrl: 'https://cdn.example/photo.jpg',
  imageWidth: 300,
  imageHeight: 200,
  alt: 'a photo',
  enableParallax: false,
  contentType: 'IMAGE' as const,
};

describe('CollectionContentRenderer — follow toggle on collection cards', () => {
  it('renders the follow toggle on a collection card inside a FollowsProvider', () => {
    withFollows(<CollectionContentRenderer {...collectionCardProps} />);
    expect(screen.getByRole('button', { name: /follow collection/i })).toHaveTextContent('Follow');
  });

  it('reflects existing follow state from the provider', () => {
    withFollows(<CollectionContentRenderer {...collectionCardProps} />, [301]);
    const button = screen.getByRole('button', { name: /unfollow collection/i });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Following');
  });

  it('persists the COLLECTION id, not the content-block id', () => {
    withFollows(<CollectionContentRenderer {...collectionCardProps} />);
    fireEvent.click(screen.getByRole('button', { name: /follow collection/i }));
    expect(addFollow).toHaveBeenCalledWith(301);
    expect(addFollow).not.toHaveBeenCalledWith(7);
  });

  it('keeps the card a navigation link and does not navigate when the toggle is clicked', () => {
    withFollows(<CollectionContentRenderer {...collectionCardProps} />);
    const link = screen.getByRole('link', { name: 'Dolomites' });
    expect(link).toHaveAttribute('href', '/dolomites-2025');
    expect(link.querySelector('button')).toBeNull();

    const click = fireEvent.click(screen.getByRole('button', { name: /follow collection/i }));
    expect(click).toBe(false);
  });

  it('keeps the card box (position class, parallax container, sizing) on the outer element', () => {
    const { container } = withFollows(<CollectionContentRenderer {...collectionCardProps} />);
    const box = container.querySelector('[data-parallax-container]') as HTMLElement;
    expect(box.tagName).toBe('DIV');
    expect(box.className).toContain('imageSingle');
    expect(box.style.width).toBe('300px');
    expect(box.style.height).toBe('200px');
    expect(box.style.position).toBe('relative');
    expect(box.querySelector('a[href="/dolomites-2025"]')).not.toBeNull();
  });

  it('renders no toggle on a plain photo block', () => {
    const { container } = withFollows(<CollectionContentRenderer {...photoProps} />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders no toggle on a slug card whose collection id is unknown (synthetic home tiles)', () => {
    const { container } = withFollows(
      <CollectionContentRenderer {...collectionCardProps} followCollectionId={undefined} />
    );
    expect(screen.getByRole('link', { name: 'Dolomites' })).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders no toggle when no FollowsProvider is mounted', () => {
    const { container } = render(<CollectionContentRenderer {...collectionCardProps} />);
    expect(screen.getByRole('link', { name: 'Dolomites' })).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });
});
