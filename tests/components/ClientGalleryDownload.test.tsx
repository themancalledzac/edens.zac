/**
 * Tests for ClientGalleryDownload
 *
 * Verifies the format-picker flow:
 *  - Click "Download All" → opens a picker with "Web Optimized" / "Full Size" / "Cancel"
 *  - Picking a format sets `window.location.href` to the BFF download URL with the
 *    chosen format and disables the buttons while preparing.
 *  - Cancel and Escape close the picker.
 *  - After the 4-second cooldown the picker collapses back to "Download All".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import { downloadCollectionUrl } from '@/app/lib/api/downloads';

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

describe('ClientGalleryDownload', () => {
  beforeEach(() => {
    window.location.href = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders a "Download All" button in the idle state', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    const button = screen.getByRole('button', { name: /download all/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('opens a format picker on click instead of triggering download', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));

    expect(screen.getByRole('button', { name: /web optimized/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full size/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    // No navigation yet — user hasn't picked a format.
    expect(window.location.href).toBe('');
  });

  it('sets href to the web download URL when "Web Optimized" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'web'));
  });

  it('sets href to the original download URL when "Full Size" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /full size/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'original'));
  });

  it('shows "Preparing…" and disables both format buttons while preparing', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    const preparingBtn = screen.getByRole('button', { name: /preparing…/i });
    expect(preparingBtn).toBeDisabled();
    // The other format button is also disabled (still rendered with its idle label).
    expect(screen.getByRole('button', { name: /full size/i })).toBeDisabled();
    // Cancel is hidden during preparing to prevent mid-download dismissal.
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('returns to the idle "Download All" state after the 4s cooldown', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('button', { name: /^download all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /preparing…/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web optimized/i })).not.toBeInTheDocument();
  });

  it('closes the picker when "Cancel" is clicked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.getByRole('button', { name: /^download all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web optimized/i })).not.toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('closes the picker when Escape is pressed', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    expect(screen.getByRole('button', { name: /web optimized/i })).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.getByRole('button', { name: /^download all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web optimized/i })).not.toBeInTheDocument();
  });

  it('URL-encodes the slug in the navigation target', () => {
    render(<ClientGalleryDownload collectionSlug="hello world & more" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('hello world & more', 'web'));
    expect(window.location.href).toBe(
      '/api/proxy/api/read/collections/hello%20world%20%26%20more/download?format=web'
    );
  });
});
