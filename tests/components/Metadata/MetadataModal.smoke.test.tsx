import { fireEvent, render, screen } from '@testing-library/react';

import MetadataModal from '@/app/components/Metadata/MetadataModal';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

// Stable empty-array constants prevent infinite useEffect loops caused by the component's
// `availableLocations = []` default parameter creating a new reference on every render.
const EMPTY_LOCATIONS: never[] = [];

const imageFixture = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
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
  }) as ContentImageModel;

const gifFixture = (id: number, overrides: Partial<ContentGifModel> = {}): ContentGifModel =>
  ({
    id,
    orderIndex: 0,
    contentType: 'GIF',
    gifUrl: `https://cdn.example.com/${id}.mp4`,
    thumbnailUrl: `https://cdn.example.com/${id}.webp`,
    width: 1920,
    height: 1080,
    title: `Gif ${id}`,
    alt: `Alt ${id}`,
    rating: null,
    collections: [],
    ...overrides,
  }) as ContentGifModel;

describe('MetadataModal — smoke', () => {
  const baseProps = {
    onClose: jest.fn(),
    selectedIds: [101],
    selectedImages: [imageFixture(101)],
    // Pass stable references to prevent infinite useEffect loops from default parameter `[]`s.
    availableLocations: EMPTY_LOCATIONS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
  });

  it('renders the edit-image heading for a single-image edit', () => {
    render(<MetadataModal {...baseProps} />);
    expect(screen.getByRole('heading', { name: /edit image metadata/i })).toBeInTheDocument();
  });

  it('renders a bulk-edit heading with the count', () => {
    const images = [imageFixture(101), imageFixture(102), imageFixture(103)];
    render(<MetadataModal {...baseProps} selectedIds={[101, 102, 103]} selectedImages={images} />);
    expect(screen.getByRole('heading', { name: /edit 3 images/i })).toBeInTheDocument();
  });

  it('renders the GIF preview as a <video> element for a single-GIF edit', () => {
    const gif = gifFixture(202);
    // Modal uses createPortal to render into document.body, so container.querySelector
    // misses it — query the document instead.
    render(<MetadataModal {...baseProps} selectedIds={[202]} selectedImages={[gif]} />);
    expect(document.querySelector('video')).toBeInTheDocument();
  });

  it('disables Save when there are no pending changes', () => {
    render(<MetadataModal {...baseProps} />);
    const save = screen.getByRole('button', { name: /^save$/i });
    expect(save).toBeDisabled();
  });

  it('Cancel calls onClose when there are no changes (no confirm)', () => {
    const onClose = jest.fn();
    render(<MetadataModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('Delete shows a confirmation dialog before doing anything', () => {
    render(<MetadataModal {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(window.confirm).toHaveBeenCalled();
  });

  it('bulk Save button shows the image count in its label', () => {
    const images = [imageFixture(101), imageFixture(102), imageFixture(103)];
    render(<MetadataModal {...baseProps} selectedIds={[101, 102, 103]} selectedImages={images} />);
    expect(screen.getByRole('button', { name: /^save 3$/i })).toBeInTheDocument();
  });

  it('renders Remove-from-collection only when currentCollectionId is set', () => {
    const { rerender } = render(<MetadataModal {...baseProps} />);
    expect(screen.queryByRole('button', { name: /^remove$/i })).not.toBeInTheDocument();
    rerender(<MetadataModal {...baseProps} currentCollectionId={42} />);
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();
  });
});
