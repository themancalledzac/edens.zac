import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';
import {
  type InlineEditContextValue,
  InlineEditProvider,
} from '@/app/components/ContentCollection/edit/InlineEditContext';
import type { TextBlockItem } from '@/app/types/Content';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));

// Collection filter context is not exercised by these tests (no test switches it on), so it
// always resolves to null (public, non-filter-bar rendering).
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));
// The FilterToolbar pulls in a deep dependency tree irrelevant to these tests; stub it.
jest.mock('@/app/components/ui/FilterToolbar/FilterToolbar', () => ({
  FilterToolbar: () => null,
}));
jest.mock('@/app/components/auth/MeProvider', () => ({
  useMe: jest.fn(() => null),
}));

import { useMe } from '@/app/components/auth/MeProvider';
import { type MeResponse } from '@/app/types/Auth';

const mockUseMe = useMe as jest.MockedFunction<typeof useMe>;

const adminPrincipal: MeResponse = {
  email: 'admin@b.com',
  isAdmin: true,
  mfaSatisfied: true,
  galleries: [],
};

/** Inert inline-edit surface; each test overrides only the fields it exercises. */
const inlineEditBase: InlineEditContextValue = {
  title: '',
  description: '',
  onCommitField: jest.fn(),
  onEditLocation: jest.fn(),
  onTogglePickCover: null,
  isPickingCover: false,
  hasCover: true,
};

const baseProps = {
  contentId: 42,
  className: 'imageSingle',
  width: 300,
  height: 200,
  isMobile: false,
  imageUrl: '',
  imageWidth: 300,
  imageHeight: 200,
  alt: 'metadata block',
  enableParallax: false,
  contentType: 'TEXT' as const,
};

describe('CollectionContentRenderer — TEXT branch sibling collections', () => {
  it('renders a Related label and a link per collection item', () => {
    const textItems: TextBlockItem[] = [
      { type: 'collection', value: 'Dolomites Film', slug: '/dolomites-film' },
      { type: 'collection', value: 'Dolomites 2025', slug: '/dolomites-2025' },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dolomites Film' })).toHaveAttribute(
      'href',
      '/dolomites-film'
    );
    expect(screen.getByRole('link', { name: 'Dolomites 2025' })).toHaveAttribute(
      'href',
      '/dolomites-2025'
    );
  });

  it('renders no Related label when there are no collection items', () => {
    const textItems: TextBlockItem[] = [{ type: 'description', value: 'Just a description' }];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.queryByText('Related')).not.toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — sibling collections as cover cards', () => {
  it('renders a cover-image card per sibling when coverImageUrl is present', () => {
    const textItems: TextBlockItem[] = [
      {
        type: 'collection',
        value: 'Dolomites Film',
        slug: '/dolomites-film',
        coverImageUrl: 'https://cdn.example.com/dolomites-film.jpg',
      },
      {
        type: 'collection',
        value: 'Dolomites 2025',
        slug: '/dolomites-2025',
        coverImageUrl: 'https://cdn.example.com/dolomites-2025.jpg',
      },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);

    // Related context preserved
    expect(screen.getByText('Related')).toBeInTheDocument();

    // Each card is a link to /{slug} with an accessible name (the collection title)
    const filmLink = screen.getByRole('link', { name: /Dolomites Film/ });
    expect(filmLink).toHaveAttribute('href', '/dolomites-film');
    const link2025 = screen.getByRole('link', { name: /Dolomites 2025/ });
    expect(link2025).toHaveAttribute('href', '/dolomites-2025');

    // Cover images render with alt text = collection name
    const filmImage = screen.getByRole('img', { name: 'Dolomites Film' });
    expect(filmImage).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dolomites 2025' })).toBeInTheDocument();
  });

  it('renders a sibling without coverImageUrl as a text-link chip inside the card row', () => {
    const textItems: TextBlockItem[] = [
      {
        type: 'collection',
        value: 'Has Cover',
        slug: '/has-cover',
        coverImageUrl: 'https://cdn.example.com/has-cover.jpg',
      },
      { type: 'collection', value: 'No Cover', slug: '/no-cover' },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);

    // Card path is active (one sibling has a cover) so we still see the cover image
    expect(screen.getByRole('img', { name: 'Has Cover' })).toBeInTheDocument();

    // The cover-less sibling is still a navigable link (rendered as a text chip)
    const noCoverLink = screen.getByRole('link', { name: 'No Cover' });
    expect(noCoverLink).toHaveAttribute('href', '/no-cover');
    // No image rendered for the cover-less sibling
    expect(screen.queryByRole('img', { name: 'No Cover' })).not.toBeInTheDocument();
  });

  it('falls back to plain text links when NO sibling has a coverImageUrl', () => {
    const textItems: TextBlockItem[] = [
      { type: 'collection', value: 'Dolomites Film', slug: '/dolomites-film' },
      { type: 'collection', value: 'Dolomites 2025', slug: '/dolomites-2025' },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);

    expect(screen.getByText('Related')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dolomites Film' })).toHaveAttribute(
      'href',
      '/dolomites-film'
    );
    expect(screen.getByRole('link', { name: 'Dolomites 2025' })).toHaveAttribute(
      'href',
      '/dolomites-2025'
    );
    // No images in the pure-fallback path
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — TEXT branch inline edit context', () => {
  const textItems: TextBlockItem[] = [
    { type: 'date', value: '2026-01-01' },
    { type: 'location', value: 'Dolomites', slug: 'dolomites' },
    { type: 'description', value: 'A trip writeup' },
  ];

  it('renders metadata read-only with no inputs when no edit context is present', () => {
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('A trip writeup')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dolomites' })).toHaveAttribute(
      'href',
      '/location/dolomites'
    );
    expect(screen.queryByLabelText('Collection title')).not.toBeInTheDocument();
  });

  it('renders editable title and description and a tappable location with a mock context', () => {
    const onCommitField = jest.fn();
    const onEditLocation = jest.fn();
    const ctx: InlineEditContextValue = {
      ...inlineEditBase,
      title: 'My Trip',
      description: 'A trip writeup',
      onCommitField,
      onEditLocation,
    };

    render(
      <InlineEditProvider value={ctx}>
        <CollectionContentRenderer {...baseProps} textItems={textItems} />
      </InlineEditProvider>
    );

    expect(screen.getByLabelText('Collection title')).toHaveTextContent('My Trip');

    fireEvent.click(screen.getByLabelText('Collection title'));
    const titleInput = screen.getByRole('textbox', { name: 'Collection title' });
    fireEvent.change(titleInput, { target: { value: 'Renamed' } });
    fireEvent.blur(titleInput);
    expect(onCommitField).toHaveBeenCalledWith('title', 'Renamed');

    expect(screen.queryByRole('link', { name: 'Dolomites' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dolomites' }));
    expect(onEditLocation).toHaveBeenCalledTimes(1);
  });
});

describe('CollectionContentRenderer — coverless collection tile (regression)', () => {
  const coverlessCollectionProps = {
    contentId: 99,
    className: 'imageSingle',
    width: 300,
    height: 200,
    isMobile: false,
    imageUrl: '',
    imageWidth: 300,
    imageHeight: 200,
    alt: 'Lisbon collection',
    enableParallax: false,
    contentType: 'COLLECTION' as const,
    isCollection: true,
    hasSlug: 'lisbon',
    overlayText: 'Lisbon',
  };

  it('renders a navigation link to the collection even with no cover image', () => {
    render(<CollectionContentRenderer {...coverlessCollectionProps} />);
    const link = screen.getByRole('link', { name: 'Lisbon' });
    expect(link).toHaveAttribute('href', '/lisbon');
  });

  it('shows the collection title (not a generic "No Image") on the coverless tile', () => {
    render(<CollectionContentRenderer {...coverlessCollectionProps} />);
    expect(screen.getByText('Lisbon')).toBeInTheDocument();
    expect(screen.queryByText('No Image')).not.toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — cover "Update" shortcut (isAdmin-gated)', () => {
  // The header cover image is the parallax IMAGE block with the sentinel id -1.
  const coverProps = {
    contentId: -1,
    className: 'imageSingle',
    width: 600,
    height: 400,
    isMobile: false,
    imageUrl: 'https://cdn.example.com/cover.jpg',
    imageWidth: 600,
    imageHeight: 400,
    alt: 'Cover',
    enableParallax: true,
    contentType: 'IMAGE' as const,
    overlayText: 'My Gallery',
    collectionSlug: 'my-gallery',
  };

  beforeEach(() => {
    pushMock.mockClear();
    mockUseMe.mockReturnValue(null);
  });

  it('shows the shortcut and navigates to ?manage=1 for an isAdmin principal', () => {
    mockUseMe.mockReturnValue(adminPrincipal);
    render(<CollectionContentRenderer {...coverProps} />);

    const button = screen.getByRole('button', { name: 'Update' });
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledWith('/my-gallery?manage=1');
  });

  it('does not show the shortcut for a logged-out viewer (useMe() returns null)', () => {
    mockUseMe.mockReturnValue(null);
    render(<CollectionContentRenderer {...coverProps} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut for a logged-in non-admin principal', () => {
    mockUseMe.mockReturnValue({
      email: 'user@b.com',
      isAdmin: false,
      mfaSatisfied: true,
      galleries: [],
    });
    render(<CollectionContentRenderer {...coverProps} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut in manage mode (currentCollectionId set), even for an admin', () => {
    mockUseMe.mockReturnValue(adminPrincipal);
    render(<CollectionContentRenderer {...coverProps} currentCollectionId={7} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut on a non-cover image (contentId !== -1), even for an admin', () => {
    mockUseMe.mockReturnValue(adminPrincipal);
    render(<CollectionContentRenderer {...coverProps} contentId={123} enableParallax={false} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut when no collectionSlug is available, even for an admin', () => {
    mockUseMe.mockReturnValue(adminPrincipal);
    render(<CollectionContentRenderer {...coverProps} collectionSlug={undefined} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — cover-pick toggle on the manage grid', () => {
  // Same sentinel-id cover block as above, but on the manage path (currentCollectionId set), so
  // the public "Update" shortcut stands down and the inline-edit surface takes over.
  const coverProps = {
    contentId: -1,
    className: 'imageSingle',
    width: 600,
    height: 400,
    isMobile: false,
    imageUrl: 'https://cdn.example.com/cover.jpg',
    imageWidth: 600,
    imageHeight: 400,
    alt: 'Cover',
    enableParallax: true,
    contentType: 'IMAGE' as const,
    overlayText: 'My Gallery',
    collectionSlug: 'my-gallery',
    currentCollectionId: 7,
  };

  function renderCover(ctx: Partial<InlineEditContextValue>, contentId = -1) {
    render(
      <InlineEditProvider value={{ ...inlineEditBase, ...ctx }}>
        <CollectionContentRenderer {...coverProps} contentId={contentId} />
      </InlineEditProvider>
    );
  }

  beforeEach(() => {
    mockUseMe.mockReturnValue(adminPrincipal);
  });

  it('renders the toggle on the cover block and fires it on click', () => {
    const onTogglePickCover = jest.fn();
    renderCover({ onTogglePickCover });

    fireEvent.click(screen.getByRole('button', { name: 'Change cover image' }));
    expect(onTogglePickCover).toHaveBeenCalledTimes(1);
  });

  it('flips to a cancel affordance while a pick is in progress', () => {
    renderCover({ onTogglePickCover: jest.fn(), isPickingCover: true });

    const button = screen.getByRole('button', { name: 'Cancel cover selection' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Change cover image' })).not.toBeInTheDocument();
  });

  it('stands down when the active manage mode owns grid clicks (null toggle)', () => {
    renderCover({ onTogglePickCover: null });
    expect(screen.queryByRole('button', { name: 'Change cover image' })).not.toBeInTheDocument();
  });

  it('renders nothing on an ordinary content image — only the cover block carries it', () => {
    renderCover({ onTogglePickCover: jest.fn() }, 123);
    expect(screen.queryByRole('button', { name: 'Change cover image' })).not.toBeInTheDocument();
  });

  it('is absent on the public view, where no inline-edit surface is mounted', () => {
    render(<CollectionContentRenderer {...coverProps} />);
    expect(screen.queryByRole('button', { name: 'Change cover image' })).not.toBeInTheDocument();
  });
});

describe('CollectionContentRenderer — cover-pick entry point for a coverless collection', () => {
  const railProps = {
    contentId: 42,
    className: 'imageSingle',
    width: 300,
    height: 200,
    isMobile: false,
    imageUrl: '',
    imageWidth: 300,
    imageHeight: 200,
    alt: 'metadata block',
    enableParallax: false,
    contentType: 'TEXT' as const,
    textItems: [{ type: 'description' as const, value: 'A trip writeup' }],
  };

  function renderRail(ctx: Partial<InlineEditContextValue>) {
    render(
      <InlineEditProvider value={{ ...inlineEditBase, ...ctx }}>
        <CollectionContentRenderer {...railProps} />
      </InlineEditProvider>
    );
  }

  it('offers "Set cover image" in the metadata rail when the collection has no cover', () => {
    const onTogglePickCover = jest.fn();
    renderRail({ hasCover: false, onTogglePickCover });

    fireEvent.click(screen.getByRole('button', { name: /Set cover image/ }));
    expect(onTogglePickCover).toHaveBeenCalledTimes(1);
  });

  it('withholds it once a cover exists — the cover block carries the toggle instead', () => {
    renderRail({ hasCover: true, onTogglePickCover: jest.fn() });
    expect(screen.queryByRole('button', { name: /Set cover image/ })).not.toBeInTheDocument();
  });

  it('withholds it when the active manage mode owns grid clicks (null toggle)', () => {
    renderRail({ hasCover: false, onTogglePickCover: null });
    expect(screen.queryByRole('button', { name: /Set cover image/ })).not.toBeInTheDocument();
  });
});
