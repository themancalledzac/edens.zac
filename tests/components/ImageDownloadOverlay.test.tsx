/**
 * Tests for ImageDownloadOverlay
 *
 * Verifies that the per-image download button:
 *  - Sets `window.location.href` to the BFF download URL on click.
 *  - Calls `e.stopPropagation()` so the click does not bubble to a parent
 *    fullscreen-trigger handler (clicking the icon should download, not
 *    open the lightbox).
 */

import { fireEvent, render, screen } from '@testing-library/react';

import ImageDownloadOverlay from '@/app/components/ClientGalleryDownload/ImageDownloadOverlay';
import { downloadImageUrl } from '@/app/lib/api/downloads';

// Replace window.location with a writable stub so we can assert on `href`
// assignments without triggering jsdom navigation.
const originalLocation = window.location;

beforeAll(() => {
  delete (window as { location?: Location }).location;
  (window as unknown as { location: { href: string } }).location = { href: '' };
});

afterAll(() => {
  (window as unknown as { location: Location }).location = originalLocation;
});

describe('ImageDownloadOverlay', () => {
  beforeEach(() => {
    window.location.href = '';
  });

  it('renders a download button with an accessible label', () => {
    render(<ImageDownloadOverlay imageId={42} />);
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });

  it('sets window.location.href to downloadImageUrl(imageId) on click', () => {
    render(<ImageDownloadOverlay imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(window.location.href).toBe(downloadImageUrl(42));
  });

  it('uses the correct URL for a different imageId', () => {
    render(<ImageDownloadOverlay imageId={9001} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(window.location.href).toBe(downloadImageUrl(9001));
    expect(window.location.href).toBe(
      '/api/proxy/api/read/content/images/9001/download?format=web'
    );
  });

  it('calls e.stopPropagation() so the click does not bubble to a fullscreen handler', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <ImageDownloadOverlay imageId={42} />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /download image/i }));

    expect(window.location.href).toBe(downloadImageUrl(42));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
