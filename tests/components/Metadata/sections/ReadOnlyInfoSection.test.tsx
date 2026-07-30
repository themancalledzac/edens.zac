import { render, screen } from '@testing-library/react';

import ReadOnlyInfoSection from '@/app/components/Metadata/sections/ReadOnlyInfoSection';
import type { ContentGifModel, ContentImageModel } from '@/app/types/Content';

const imageFixture = (overrides: Partial<ContentImageModel> = {}): ContentImageModel =>
  ({
    id: 42,
    contentType: 'IMAGE',
    imageUrl: 'https://cdn.example.com/42.jpg',
    imageWidth: 4000,
    imageHeight: 3000,
    captureDate: '2023-10-13T02:32:00',
    rawFileName: '_DSC0272-Enhanced-NR.webp',
    createdAt: '2024-01-05T18:00:00',
    locations: [],
    ...overrides,
  }) as ContentImageModel;

const gifFixture = (overrides: Partial<ContentGifModel> = {}): ContentGifModel =>
  ({
    id: 7,
    contentType: 'GIF',
    gifUrl: 'https://cdn.example.com/7.mp4',
    width: 1920,
    height: 1080,
    captureDate: '2023-10-13T02:32:00',
    createdAt: '2024-01-05T18:00:00',
    ...overrides,
  }) as ContentGifModel;

describe('ReadOnlyInfoSection', () => {
  it('renders the non-editable facts an admin needs while editing an image', () => {
    render(<ReadOnlyInfoSection content={imageFixture()} />);

    expect(screen.getByText('Captured')).toBeInTheDocument();
    expect(screen.getByText('October 13th, 2023')).toBeInTheDocument();
    expect(screen.getByText('_DSC0272-Enhanced-NR.webp')).toBeInTheDocument();
    expect(screen.getByText('4000 × 3000')).toBeInTheDocument();
    expect(screen.getByText('January 5th, 2024')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('omits rows the content block does not carry rather than rendering placeholders', () => {
    render(
      <ReadOnlyInfoSection
        content={imageFixture({
          captureDate: null,
          rawFileName: null,
          imageWidth: undefined,
          imageHeight: undefined,
          createdAt: undefined,
        })}
      />
    );

    expect(screen.queryByText('Captured')).not.toBeInTheDocument();
    expect(screen.queryByText('File')).not.toBeInTheDocument();
    expect(screen.queryByText('Dimensions')).not.toBeInTheDocument();
    expect(screen.queryByText('Uploaded')).not.toBeInTheDocument();
    expect(screen.getByText('Content ID')).toBeInTheDocument();
  });

  it('reads GIF dimensions from width/height and leaves the capture date to the editable row', () => {
    render(<ReadOnlyInfoSection content={gifFixture()} />);

    expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    expect(screen.queryByText('Captured')).not.toBeInTheDocument();
    expect(screen.queryByText('File')).not.toBeInTheDocument();
  });
});
