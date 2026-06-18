import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import MetadataModal from '@/app/components/Metadata/MetadataModal';
import type { ContentImageModel } from '@/app/types/Content';

const EMPTY_LOCATIONS: never[] = [];

function imageFixture(id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel {
  return {
    id,
    orderIndex: 0,
    contentType: 'IMAGE',
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    imageWidth: 4000,
    imageHeight: 3000,
    title: `Image ${id}`,
    alt: `Alt ${id}`,
    rating: null,
    blackAndWhite: false,
    isFilm: false,
    collections: [],
    tags: [],
    people: [],
    locations: [],
    ...overrides,
  } as ContentImageModel;
}

const baseProps = {
  onClose: jest.fn(),
  selectedIds: [101],
  selectedImages: [imageFixture(101)],
  availableLocations: EMPTY_LOCATIONS,
};

describe('MetadataModal — cancel/close button label', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('labels the action "Close" when no edits have been made', () => {
    render(<MetadataModal {...baseProps} />);
    // Exact name avoids matching the "Close metadata editor" X button.
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('switches the label to "Cancel" once a field is edited', () => {
    render(<MetadataModal {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText(/enter image title/i), {
      target: { value: 'A brand new title' },
    });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });
});
