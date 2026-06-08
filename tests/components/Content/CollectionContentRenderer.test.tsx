import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';
import type { TextBlockItem } from '@/app/types/Content';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));

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
  it('renders "More in this series" label and a text link per collection item when no cover images', () => {
    const textItems: TextBlockItem[] = [
      { type: 'collection', value: 'Dolomites Film', slug: '/dolomites-film' },
      { type: 'collection', value: 'Dolomites 2025', slug: '/dolomites-2025' },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.getByText('More in this series')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dolomites Film' })).toHaveAttribute(
      'href',
      '/dolomites-film'
    );
    expect(screen.getByRole('link', { name: 'Dolomites 2025' })).toHaveAttribute(
      'href',
      '/dolomites-2025'
    );
  });

  it('renders cover tiles when collection items have imageUrl', () => {
    const textItems: TextBlockItem[] = [
      {
        type: 'collection',
        value: 'Dolomites Film',
        slug: '/dolomites-film',
        imageUrl: 'https://cdn.example.com/dolomites-film.jpg',
      },
    ];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.getByText('More in this series')).toBeInTheDocument();
    const tile = screen.getByRole('link', { name: 'Dolomites Film' });
    expect(tile).toHaveAttribute('href', '/dolomites-film');
    expect(screen.getByAltText('Dolomites Film')).toBeInTheDocument();
  });

  it('renders no "More in this series" section when there are no collection items', () => {
    const textItems: TextBlockItem[] = [{ type: 'description', value: 'Just a description' }];
    render(<CollectionContentRenderer {...baseProps} textItems={textItems} />);
    expect(screen.queryByText('More in this series')).not.toBeInTheDocument();
  });
});
