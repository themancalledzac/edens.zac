import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import CollectionContentRenderer from '@/app/components/Content/CollectionContentRenderer';
import {
  type InlineEditContextValue,
  InlineEditProvider,
} from '@/app/components/ContentCollection/edit/InlineEditContext';
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
