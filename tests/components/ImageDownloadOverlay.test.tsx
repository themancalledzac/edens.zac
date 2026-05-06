/**
 * Tests for ImageDownloadOverlay
 *
 * Verifies the per-image expand-and-pick flow:
 *  - Click icon → reveals Web/Full picker (stops click bubbling).
 *  - Picking a format calls `fetch()` with credentials, builds a blob URL,
 *    and triggers a programmatic `<a download>` click.
 *  - Failed `original` fetch (404) shows an error message that auto-clears
 *    after 3s, without throwing.
 *  - Esc collapses the picker while idle.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ImageDownloadOverlay from '@/app/components/ClientGalleryDownload/ImageDownloadOverlay';
import { downloadImageUrl } from '@/app/lib/api/downloads';

describe('ImageDownloadOverlay', () => {
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

  // Stub fetch to return a successful blob response by default.
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
    render(<ImageDownloadOverlay imageId={42} />);
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });

  it('expands to show Web and Full Size buttons when the icon is clicked', () => {
    render(<ImageDownloadOverlay imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));

    expect(screen.getByRole('button', { name: /web-optimized/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full-size/i })).toBeInTheDocument();
  });

  it('fetches the web URL with credentials when "Web" is picked', async () => {
    const fetchMock = stubFetchOk();
    render(<ImageDownloadOverlay imageId={42} />);
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
    render(<ImageDownloadOverlay imageId={9001} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    fireEvent.click(screen.getByRole('button', { name: /full-size/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(downloadImageUrl(9001, 'original'), {
      credentials: 'include',
    });
  });

  it('shows an error message when "Full Size" fetch returns 404', async () => {
    stubFetch404();
    render(<ImageDownloadOverlay imageId={42} />);
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
      render(<ImageDownloadOverlay imageId={42} />);
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
        <ImageDownloadOverlay imageId={42} />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('collapses on Escape', () => {
    render(<ImageDownloadOverlay imageId={42} />);
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(screen.getByRole('button', { name: /web-optimized/i })).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(screen.queryByRole('button', { name: /web-optimized/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download image/i })).toBeInTheDocument();
  });

  it('collapses on outside click', () => {
    render(
      <div data-testid="outside">
        <ImageDownloadOverlay imageId={42} />
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /download image/i }));
    expect(screen.getByRole('button', { name: /web-optimized/i })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('button', { name: /web-optimized/i })).not.toBeInTheDocument();
  });
});
