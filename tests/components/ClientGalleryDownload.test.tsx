/**
 * Tests for ClientGalleryDownload
 *
 * Verifies that the "Download All" button:
 *  - Sets `window.location.href` to the BFF collection download URL on click.
 *  - Switches the label to "Preparing ZIP…" and disables itself during the
 *    4-second cooldown so users don't double-trigger.
 *  - Returns to the normal label/enabled state after the cooldown elapses.
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

  it('sets window.location.href to downloadCollectionUrl(slug) on click', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding'));
  });

  it('shows "Preparing ZIP…" and disables the button while preparing', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));

    const preparingButton = screen.getByRole('button', { name: /preparing zip/i });
    expect(preparingButton).toBeInTheDocument();
    expect(preparingButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^download all$/i })).not.toBeInTheDocument();
  });

  it('returns to the normal "Download All" label and re-enables after 4s', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    expect(screen.getByRole('button', { name: /preparing zip/i })).toBeDisabled();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    const button = screen.getByRole('button', { name: /^download all$/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: /preparing zip/i })).not.toBeInTheDocument();
  });

  it('URL-encodes the slug in the navigation target', () => {
    render(<ClientGalleryDownload collectionSlug="hello world & more" />);
    fireEvent.click(screen.getByRole('button', { name: /download all/i }));
    expect(window.location.href).toBe(downloadCollectionUrl('hello world & more'));
    expect(window.location.href).toBe(
      '/api/proxy/api/read/collections/hello%20world%20%26%20more/download?format=web'
    );
  });
});
