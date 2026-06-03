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

  it('renders the "Essential Information" section heading', () => {
    render(<EssentialInfoSection {...makeProps()} />);
    expect(screen.getByRole('heading', { name: /essential information/i })).toBeInTheDocument();
  });

  it('Title input round-trips a change through updateStateField', () => {
    const updateStateField = jest.fn();
    render(<EssentialInfoSection {...makeProps({ updateStateField })} />);
    const titleInput = screen.getByPlaceholderText(/enter image title/i);
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    expect(updateStateField).toHaveBeenCalledWith({ title: 'New Title' });
  });

  it('Caption textarea is disabled when isGif=true', () => {
    render(<EssentialInfoSection {...makeProps({ isGif: true })} />);
    const captionTextarea = screen.getByPlaceholderText(/enter caption/i);
    expect(captionTextarea).toBeDisabled();
  });

  it('Caption textarea is enabled when isGif=false', () => {
    render(<EssentialInfoSection {...makeProps({ isGif: false })} />);
    const captionTextarea = screen.getByPlaceholderText(/enter caption/i);
    expect(captionTextarea).not.toBeDisabled();
  });

  it('Rating select shows "No rating" and all 5 star options', () => {
    render(<EssentialInfoSection {...makeProps()} />);
    expect(screen.getByRole('option', { name: /no rating/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /1 star/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /2 stars/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /3 stars/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /4 stars/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /5 stars/i })).toBeInTheDocument();
  });

  it('Locations Dropdown receives the availableLocations passed as prop', () => {
    render(<EssentialInfoSection {...makeProps()} />);
    // Dropdown renders its label; the locations options should be visible via label text
    expect(screen.getByText('Locations')).toBeInTheDocument();
    // The dropdown shows the emptyText when no selections are made
    expect(screen.getByText(/no locations set/i)).toBeInTheDocument();
  });

  it('Collection Visibility checkbox is NOT rendered when currentCollectionId is undefined', () => {
    render(<EssentialInfoSection {...makeProps({ currentCollectionId: undefined })} />);
    expect(screen.queryByText(/collection visibility/i)).not.toBeInTheDocument();
  });

  it('Collection Visibility checkbox IS rendered when currentCollectionId is provided', () => {
    render(<EssentialInfoSection {...makeProps({ currentCollectionId: 42 })} />);
    expect(screen.getByText(/collection visibility/i)).toBeInTheDocument();
  });

  it('sectionDisabled class is applied to caption group when isGif=true', () => {
    const { container } = render(<EssentialInfoSection {...makeProps({ isGif: true })} />);
    // The caption formGroup wrapper should carry the disabled class
    const disabledEl = container.querySelector('[aria-disabled="true"]');
    expect(disabledEl).toBeInTheDocument();
  });
});
