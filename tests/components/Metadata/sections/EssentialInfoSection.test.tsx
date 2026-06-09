import { fireEvent, render, screen } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/Metadata/hooks/useMetadataState';
import EssentialInfoSection from '@/app/components/Metadata/sections/EssentialInfoSection';
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

  it('hides Title, Caption, and Alt in bulk edit but keeps Author', () => {
    render(<EssentialInfoSection {...makeProps({ isBulkEdit: true })} />);
    expect(screen.queryByPlaceholderText('Enter image title')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Enter caption')).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText('Describe the image for screen readers')
    ).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Photographer name')).toBeInTheDocument();
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

  // Characterization tests for the collection-visibility toggle. These pin the current
  // append-vs-update junction behavior through the rendered checkbox before the logic is
  // extracted into essentialInfoUtils, proving the extraction is behavior-preserving.
  describe('Collection Visibility toggle (characterization)', () => {
    it('checkbox is checked by default when no junction exists (absent === visible)', () => {
      render(<EssentialInfoSection {...makeProps({ currentCollectionId: 42 })} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('checkbox is checked when the existing junction is not explicitly hidden', () => {
      const updateState: ImageUpdateState = {
        ...baseUpdateState,
        collections: [
          { collectionId: 42, name: 'Pacific Northwest', visible: true, orderIndex: 0 },
        ],
      };
      render(<EssentialInfoSection {...makeProps({ currentCollectionId: 42, updateState })} />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('checkbox is unchecked only when the junction is explicitly visible=false', () => {
      const updateState: ImageUpdateState = {
        ...baseUpdateState,
        collections: [
          { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 0 },
        ],
      };
      render(<EssentialInfoSection {...makeProps({ currentCollectionId: 42, updateState })} />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('APPEND branch: unchecking when the image is not yet in the collection appends a new junction with the collection name and trailing orderIndex', () => {
      const updateStateField = jest.fn();
      const updateState: ImageUpdateState = {
        ...baseUpdateState,
        collections: [{ collectionId: 7, name: 'Other', visible: true, orderIndex: 0 }],
      };
      render(
        <EssentialInfoSection
          {...makeProps({ currentCollectionId: 42, updateState, updateStateField })}
        />
      );
      // Default-visible (no junction for 42) → checkbox starts checked; uncheck it.
      fireEvent.click(screen.getByRole('checkbox'));
      expect(updateStateField).toHaveBeenCalledWith({
        collections: [
          { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
          { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 1 },
        ],
      });
    });

    it('APPEND branch: name is undefined when the collection is not in availableCollections', () => {
      const updateStateField = jest.fn();
      render(
        <EssentialInfoSection
          {...makeProps({
            currentCollectionId: 999,
            availableCollections: baseCollections,
            updateStateField,
          })}
        />
      );
      fireEvent.click(screen.getByRole('checkbox'));
      expect(updateStateField).toHaveBeenCalledWith({
        collections: [{ collectionId: 999, name: undefined, visible: false, orderIndex: 0 }],
      });
    });

    it('UPDATE branch: toggling an existing junction updates visible in place without re-ordering', () => {
      const updateStateField = jest.fn();
      const updateState: ImageUpdateState = {
        ...baseUpdateState,
        collections: [
          { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
          { collectionId: 42, name: 'Pacific Northwest', visible: true, orderIndex: 1 },
        ],
      };
      render(
        <EssentialInfoSection
          {...makeProps({ currentCollectionId: 42, updateState, updateStateField })}
        />
      );
      // Junction for 42 exists and is visible → checkbox starts checked; uncheck it.
      fireEvent.click(screen.getByRole('checkbox'));
      expect(updateStateField).toHaveBeenCalledWith({
        collections: [
          { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
          { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 1 },
        ],
      });
    });
  });
});
