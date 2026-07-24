import { fireEvent, render, screen, within } from '@testing-library/react';

import type { ImageUpdateState } from '@/app/components/Metadata/hooks/useMetadataState';
import EssentialInfoSection from '@/app/components/Metadata/sections/EssentialInfoSection';
import type { CollectionListModel, LocationModel } from '@/app/types/Collection';
import { createImageContent } from '@/tests/fixtures/contentFixtures';

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
      fireEvent.click(screen.getByRole('checkbox'));
      expect(updateStateField).toHaveBeenCalledWith({
        collections: [
          { collectionId: 7, name: 'Other', visible: true, orderIndex: 0 },
          { collectionId: 42, name: 'Pacific Northwest', visible: false, orderIndex: 1 },
        ],
      });
    });
  });

  describe('Capture date picker (GIF reference-image copy)', () => {
    const datedImage = createImageContent(1, { title: 'Beach', captureDate: '2024-06-14T00:00:00Z' });
    const undatedImage = createImageContent(2, { title: 'No Date', captureDate: null });

    it('renders when isGif=true and isBulkEdit=false', () => {
      render(
        <EssentialInfoSection
          {...makeProps({ isGif: true, isBulkEdit: false, collectionImages: [datedImage] })}
        />
      );
      expect(screen.getByText(/capture date \(copy from image\)/i)).toBeInTheDocument();
    });

    it('does not render when isGif=true and isBulkEdit=true (bulk selection)', () => {
      render(
        <EssentialInfoSection
          {...makeProps({ isGif: true, isBulkEdit: true, collectionImages: [datedImage] })}
        />
      );
      expect(screen.queryByText(/capture date \(copy from image\)/i)).not.toBeInTheDocument();
    });

    it('does not render for image content (isGif=false)', () => {
      render(
        <EssentialInfoSection
          {...makeProps({ isGif: false, isBulkEdit: false, collectionImages: [datedImage] })}
        />
      );
      expect(screen.queryByText(/capture date \(copy from image\)/i)).not.toBeInTheDocument();
    });

    it('only includes dated images as options, filtering out undated ones', () => {
      render(
        <EssentialInfoSection
          {...makeProps({
            isGif: true,
            isBulkEdit: false,
            collectionImages: [datedImage, undatedImage],
          })}
        />
      );
      expect(screen.getByRole('option', { name: /beach/i })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /no date/i })).not.toBeInTheDocument();
    });

    it('selecting an option calls updateStateField with that image\'s captureDate', () => {
      const updateStateField = jest.fn();
      render(
        <EssentialInfoSection
          {...makeProps({
            isGif: true,
            isBulkEdit: false,
            collectionImages: [datedImage],
            updateStateField,
          })}
        />
      );
      const group = screen.getByText(/capture date \(copy from image\)/i).closest('div')!;
      const select = within(group).getByRole('combobox');
      fireEvent.change(select, { target: { value: String(datedImage.id) } });
      expect(updateStateField).toHaveBeenCalledWith({ captureDate: datedImage.captureDate });
    });

    it('renders just the disabled placeholder with zero dated images (no crash)', () => {
      render(
        <EssentialInfoSection
          {...makeProps({ isGif: true, isBulkEdit: false, collectionImages: [undatedImage] })}
        />
      );
      const group = screen.getByText(/capture date \(copy from image\)/i).closest('div')!;
      const select = within(group).getByRole('combobox');
      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0]).toBeDisabled();
      expect(options[0]).toHaveTextContent(/pick a reference image/i);
    });
  });
});
