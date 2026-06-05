/**
 * Tests for FullScreenDownloadButton (renamed from ImageDownloadOverlay).
 *
 * Verifies the fullscreen-viewer per-image download flow:
 *  - Click icon → reveals Web/Full picker (stops click bubbling to the viewer).
 *  - Picking a format calls `fetch()` with credentials, builds a blob URL, and
 *    triggers a programmatic `<a download>` click (then revokes the blob URL).
 *  - Failed `original` fetch (404) shows an error that auto-clears after 3s
 *    without throwing, and never creates a blob URL.
 *  - The picker collapses when the viewer moves to a different image (imageId change).
 *
 * Ported from the deleted ImageDownloadOverlay.test.tsx; the Esc/outside-click
 * collapse cases were replaced with the new imageId-change collapse behavior.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import FullScreenDownloadButton from '@/app/components/ClientGalleryDownload/FullScreenDownloadButton';
import { downloadImageUrl } from '@/app/lib/api/downloads';

describe('FullScreenDownloadButton', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const originalFetch = (global as unknown as { fetch?: typeof fetch }).fetch;
  let createObjectUrlMock: jest.Mock;
  let revokeObjectUrlMock: jest.Mock;

  beforeEach(() => {
    createObjectUrlMock = jest.fn(() => 'blob:fake-url');
    revokeObjectUrlMock = jest.fn();
    (URL as unknown as { createObjectURL: jest.Mock }).createObjectURL = createObjectUrlMock;
    (URL as unknown as { revokeObjectURL: jest.Mock }).revokeObjectURL = revokeObjectUrlMock;
  });

  afterEach(() => {
    (URL as unknown as { createObjectURL: typeof originalCreate }).createObjectURL = originalCreate;
    (URL as unknown as { revokeObjectURL: typeof originalRevoke }).revokeObjectURL = originalRevoke;
    if (originalFetch === undefined) {
      delete (global as unknown as { fetch?: typeof fetch }).fetch;
    } else {
      (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    }
    jest.restoreAllMocks();
  });

  const stubFetchOk = (): jest.Mock => {
    const blob = new Blob(['fake bytes'], { type: 'image/webp' });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as Response);
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

  const stubFetch404 = (): jest.Mock => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      blob: () => Promise.resolve(new Blob()),
    } as Response);
    (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  };

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

  it('fetches the web URL with credentials when "Web" is picked', async () => {
    const fetchMock = stubFetchOk();
    render(<FullScreenDownloadButton imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /web-optimized/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(downloadImageUrl(42, 'web'), {
      credentials: 'include',
    });
    await waitFor(() => expect(createObjectUrlMock).toHaveBeenCalled());
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:fake-url');
  });

  it('fetches the original URL when "Full Size" is picked', async () => {
    const fetchMock = stubFetchOk();
    render(<FullScreenDownloadButton imageId={9001} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /full-size/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(downloadImageUrl(9001, 'original'), {
      credentials: 'include',
    });
  });

  it('shows an error message when "Full Size" fetch returns 404', async () => {
    stubFetch404();
    render(<FullScreenDownloadButton imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /full-size/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/original not available/i);
    // Did not create a blob URL on the failure path.
    expect(createObjectUrlMock).not.toHaveBeenCalled();
  });

  it('auto-clears the error after 3 seconds', async () => {
    jest.useFakeTimers();
    try {
      stubFetch404();
      render(<FullScreenDownloadButton imageId={42} />);
      fireEvent.click(screen.getByRole('button', { name: /download image/i }));
      fireEvent.click(screen.getByRole('button', { name: /full-size/i }));

      // Drain the pending fetch + state updates.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
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

    // Navigating to a new image should collapse back to the idle icon.
    rerender(<FullScreenDownloadButton imageId={43} />);

    expect(screen.queryByRole('button', { name: /web-optimized/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });
});
