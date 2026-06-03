import { fireEvent, render, screen } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/ImageMetadata/hooks/useImageMetadataState';
import EssentialInfoSection from '@/app/components/ImageMetadata/sections/EssentialInfoSection';
import type { CollectionListModel, LocationModel } from '@/app/types/Collection';

const baseUpdateState: ImageUpdateState = {
  id: 101,
  title: 'Test Title',
  caption: undefined,
  alt: 'Alt text',
  author: undefined,
  rating: undefined,
  locations: [],
  collections: [],
};

const baseLocations: LocationModel[] = [
  { id: 1, name: 'Seattle, WA', slug: 'seattle-wa' },
  { id: 2, name: 'Portland, OR', slug: 'portland-or' },
];

const baseCollections: CollectionListModel[] = [
  { id: 42, name: 'Pacific Northwest', slug: 'pacific-northwest' },
];

function makeProps(
  overrides: Partial<Parameters<typeof EssentialInfoSection>[0]> = {}
): Parameters<typeof EssentialInfoSection>[0] {
  return {
    updateState: baseUpdateState,
    updateStateField: jest.fn(),
    availableLocations: baseLocations,
    availableCollections: baseCollections,
    currentCollectionId: undefined,
    isGif: false,
    ...overrides,
  };
}

describe('EssentialInfoSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Title input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<EssentialInfoSection {...makeProps({ updateStateField })} />);
    const titleInput = screen.getByPlaceholderText(/enter image title/i);
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(updateStateField).toHaveBeenCalledWith({ title: 'New Title' });
  });

  it('Caption textarea is disabled for GIF content and enabled otherwise', () => {
    const { rerender } = render(<EssentialInfoSection {...makeProps({ isGif: true })} />);
    expect(screen.getByPlaceholderText(/enter caption/i)).toBeDisabled();
    rerender(<EssentialInfoSection {...makeProps({ isGif: false })} />);
    expect(screen.getByPlaceholderText(/enter caption/i)).not.toBeDisabled();
  });

  it('Rating select offers "No rating" plus the five star options', () => {
    render(<EssentialInfoSection {...makeProps()} />);
    expect(screen.getByRole('option', { name: /no rating/i })).toBeInTheDocument();
    // No rating + 1–5 stars = six options.
    expect(screen.getAllByRole('option')).toHaveLength(6);
  });

  it('Collection Visibility checkbox renders only when currentCollectionId is provided', () => {
    const { rerender } = render(
      <EssentialInfoSection {...makeProps({ currentCollectionId: undefined })} />
    );
    expect(screen.queryByText(/collection visibility/i)).not.toBeInTheDocument();
    rerender(<EssentialInfoSection {...makeProps({ currentCollectionId: 42 })} />);
    expect(screen.getByText(/collection visibility/i)).toBeInTheDocument();
  });

  it('marks the caption group aria-disabled when isGif=true', () => {
    const { container } = render(<EssentialInfoSection {...makeProps({ isGif: true })} />);
    expect(container.querySelector('[aria-disabled="true"]')).toBeInTheDocument();
  });
});
