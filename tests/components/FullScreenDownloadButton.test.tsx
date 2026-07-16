/**
 * Tests for FullScreenDownloadButton.
 *
 * Verifies the fullscreen-viewer per-image download flow:
 *  - Click icon → reveals Web/Full picker (stops click bubbling to the viewer).
 *  - Picking a format navigates to the download URL (`window.location.href`). Navigation — not
 *    `fetch`+blob — is required because the backend 302-redirects to a presigned S3 URL to bypass
 *    the Amplify response-size cap, and a cross-origin `fetch` following that redirect would be
 *    blocked by S3 CORS.
 *  - The picker collapses when the viewer moves to a different image (imageId change).
 */

import { fireEvent, render, screen } from '@testing-library/react';

import FullScreenDownloadButton from '@/app/components/ClientGalleryDownload/FullScreenDownloadButton';
import { downloadImageUrl } from '@/app/lib/api/downloads';

describe('FullScreenDownloadButton', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // jsdom's location.href is not assignable; swap in a plain object we can read back.
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string } }).location = { href: '' };
  });

  afterEach(() => {
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('renders a download icon with an accessible label in the idle state', () => {
    render(<FullScreenDownloadButton imageId={42} />);
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });

  it('expands to show Web and Full Size buttons when the icon is clicked', () => {
    render(<FullScreenDownloadButton imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));

    expect(screen.getByRole('button', { name: /web-optimized/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full-size/i })).toBeInTheDocument();
  });

  it('navigates to the web download URL when "Web" is picked', () => {
    render(<FullScreenDownloadButton imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /web-optimized/i }));

    expect(window.location.href).toBe(downloadImageUrl(42, 'web'));
  });

  it('navigates to the original download URL when "Full Size" is picked', () => {
    render(<FullScreenDownloadButton imageId={9001} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /full-size/i }));

    expect(window.location.href).toBe(downloadImageUrl(9001, 'original'));
  });

  it('stops icon click from bubbling to a parent fullscreen handler', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <FullScreenDownloadButton imageId={42} />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('collapses the picker when the viewer moves to a different image', () => {
    const { rerender } = render(<FullScreenDownloadButton imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(screen.getByRole('button', { name: /web-optimized/i })).toBeInTheDocument();

    rerender(<FullScreenDownloadButton imageId={43} />);

    expect(screen.queryByRole('button', { name: /web-optimized/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });
});
