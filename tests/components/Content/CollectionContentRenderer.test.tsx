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
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));
jest.mock('@/app/utils/environment', () => ({
  isLocalEnvironment: jest.fn(() => false),
}));

import { isLocalEnvironment } from '@/app/utils/environment';

const mockIsLocalEnvironment = isLocalEnvironment as jest.MockedFunction<typeof isLocalEnvironment>;

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
  it('renders a Related: label and a link per collection item', () => {
    const textItems: TextBlockItem[] = [
      { type: 'collection', value: 'Dolomites Film', slug: '/dolomites-film' },
      { type: 'collection', value: 'Dolomites 2025', slug: '/dolomites-2025' },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.getByText('Related:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dolomites Film' })).toHaveAttribute(
      'href',
      '/dolomites-film'
    );
    expect(screen.getByRole('link', { name: 'Dolomites 2025' })).toHaveAttribute(
      'href',
      '/dolomites-2025'
    );
  });

  it('renders no Related: label when there are no collection items', () => {
    const textItems: TextBlockItem[] = [{ type: 'description', value: 'Just a description' }];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.queryByText('Related:')).not.toBeInTheDocument();
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

    // Related: context preserved
    expect(screen.getByText('Related:')).toBeInTheDocument();

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

    expect(screen.getByText('Related:')).toBeInTheDocument();
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

describe('CollectionContentRenderer — cover "Update" shortcut (localhost public view)', () => {
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
    mockIsLocalEnvironment.mockReturnValue(false);
  });

  it('shows the shortcut and navigates to ?manage=1 on localhost public view', () => {
    mockIsLocalEnvironment.mockReturnValue(true);
    render(<CollectionContentRenderer {...coverProps} />);

    const button = screen.getByRole('button', { name: 'Update' });
    fireEvent.click(button);
    expect(pushMock).toHaveBeenCalledWith('/my-gallery?manage=1');
  });

  it('does not show the shortcut in production (non-localhost)', () => {
    mockIsLocalEnvironment.mockReturnValue(false);
    render(<CollectionContentRenderer {...coverProps} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut in manage mode (currentCollectionId set)', () => {
    mockIsLocalEnvironment.mockReturnValue(true);
    render(<CollectionContentRenderer {...coverProps} currentCollectionId={7} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut on a non-cover image (contentId !== -1)', () => {
    mockIsLocalEnvironment.mockReturnValue(true);
    render(<CollectionContentRenderer {...coverProps} contentId={123} enableParallax={false} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });

  it('does not show the shortcut when no collectionSlug is available', () => {
    mockIsLocalEnvironment.mockReturnValue(true);
    render(<CollectionContentRenderer {...coverProps} collectionSlug={undefined} />);
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument();
  });
});
