/**
 * Tests for ClientGalleryDownload
 *
 * Two flows:
 *  - **All** (no download context): "Download" section shows an "All" button → quality picker →
 *    navigates to the whole-collection download URL.
 *  - **Select** (wrapped in ClientGalleryDownloadProvider): a fixed action bar shows "N selected" +
 *    Download + Cancel; Download opens the picker and navigates to the subset download URL.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';

import ClientGalleryDownload from '@/app/components/ClientGalleryDownload/ClientGalleryDownload';
import {
  type ClientGalleryDownloadContextValue,
  ClientGalleryDownloadProvider,
} from '@/app/components/ContentCollection/ClientGalleryDownloadContext';
import { downloadCollectionSelectionUrl, downloadCollectionUrl } from '@/app/lib/api/downloads';

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

function renderWithProvider(
  slug: string,
  overrides: Partial<ClientGalleryDownloadContextValue> = {}
) {
  const value: ClientGalleryDownloadContextValue = {
    isSelectMode: false,
    selectedImageIds: [],
    enterSelectMode: jest.fn(),
    exitSelectMode: jest.fn(),
    ...overrides,
  };
  const utils = render(
    <ClientGalleryDownloadProvider value={value}>
      <ClientGalleryDownload collectionSlug={slug} />
    </ClientGalleryDownloadProvider>
  );
  return { ...utils, value };
}

describe('ClientGalleryDownload — All flow (no context)', () => {
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

  it('renders the "Download" section with an "All" button (no "Select" without a provider)', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    expect(screen.getByText('Download')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^select$/i })).not.toBeInTheDocument();
  });

  it('opens a format picker on "All" click instead of navigating', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    expect(screen.getByRole('button', { name: /web optimized/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /full size/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('navigates to the web download URL when "Web Optimized" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'web'));
  });

  it('navigates to the original download URL when "Full Size" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /full size/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'original'));
  });

  it('returns to the idle "All" state after the 4s cooldown', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web optimized/i })).not.toBeInTheDocument();
  });

  it('closes the picker on Cancel and on Escape', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /web optimized/i })).not.toBeInTheDocument();
  });

  it('URL-encodes the slug in the navigation target', () => {
    render(<ClientGalleryDownload collectionSlug="hello world & more" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    expect(window.location.href).toBe(
      '/api/proxy/api/read/collections/hello%20world%20%26%20more/download?format=web'
    );
  });
});

describe('ClientGalleryDownload — Select flow (with context)', () => {
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

  it('renders a "Select" button alongside "All" when a provider is present', () => {
    renderWithProvider('smith-wedding');
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
  });

  it('calls enterSelectMode when "Select" is clicked', () => {
    const { value } = renderWithProvider('smith-wedding');
    fireEvent.click(screen.getByRole('button', { name: /^select$/i }));
    expect(value.enterSelectMode).toHaveBeenCalledTimes(1);
  });

  it('shows the selection action bar with the live count while in select mode', () => {
    renderWithProvider('smith-wedding', { isSelectMode: true, selectedImageIds: [10, 20] });
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('disables Download when nothing is selected', () => {
    renderWithProvider('smith-wedding', { isSelectMode: true, selectedImageIds: [] });
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeDisabled();
  });

  it('navigates to the subset download URL with the selected ids', () => {
    renderWithProvider('smith-wedding', { isSelectMode: true, selectedImageIds: [10, 20] });
    fireEvent.click(screen.getByRole('button', { name: /^download$/i }));
    fireEvent.click(screen.getByRole('button', { name: /web optimized/i }));

    expect(window.location.href).toBe(
      downloadCollectionSelectionUrl('smith-wedding', [10, 20], 'web')
    );
  });

  it('calls exitSelectMode when the bar Cancel is clicked', () => {
    const { value } = renderWithProvider('smith-wedding', {
      isSelectMode: true,
      selectedImageIds: [10],
    });
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(value.exitSelectMode).toHaveBeenCalledTimes(1);
  });
});
