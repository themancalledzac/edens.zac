import { render } from '@testing-library/react';

import MediaPreview from '@/app/components/ImageMetadata/sections/MediaPreview';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

type EditableContent = ContentImageModel | ContentGifModel;

const imageFixture = (id: number, overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id,
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

describe('MediaPreview', () => {
  it('renders a <video> element for a single GIF previewImage', () => {
    const gif = gifFixture(202);
    const { container } = render(
      <MediaPreview
        isBulkEdit={false}
        selectedImages={[gif]}
        selectedImageIds={[202]}
        previewImage={gif}
      />
    );
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders an <img> element (with alt text) for a single image previewImage', () => {
    const image = imageFixture(101);
    const { container } = render(
      <MediaPreview
        isBulkEdit={false}
        selectedImages={[image]}
        selectedImageIds={[101]}
        previewImage={image}
      />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', expect.stringContaining('Alt 101'));
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('renders N thumbnails in the bulk grid with data-testid="media-preview-bulk-grid"', () => {
    const images: EditableContent[] = [imageFixture(101), imageFixture(102), imageFixture(103)];
    const { getByTestId, getAllByRole } = render(
      <MediaPreview
        isBulkEdit
        selectedImages={images}
        selectedImageIds={[101, 102, 103]}
        previewImage={images[0]}
      />
    );
    const grid = getByTestId('media-preview-bulk-grid');
    expect(grid).toBeInTheDocument();
    // next/image renders <img> elements — there should be 3
    expect(getAllByRole('img')).toHaveLength(3);
  });

  it('returns null when previewImage is undefined', () => {
    const { container } = render(
      <MediaPreview
        isBulkEdit={false}
        selectedImages={[]}
        selectedImageIds={[]}
        previewImage={undefined}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
