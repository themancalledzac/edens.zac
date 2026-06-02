import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';
import type { TextBlockItem } from '@/app/types/Content';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/hooks/useParallax', () => ({ useParallax: () => ({ current: null }) }));
jest.mock('@/app/components/ContentCollection/CollectionFilterContext', () => ({
  useCollectionFilter: () => null,
}));

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
