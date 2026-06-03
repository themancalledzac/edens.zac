/**
 * Tests for ClientGalleryDownload
 *
 * The quality picker (Web / Full / Cancel) always lives in the single bottom action bar, for BOTH
 * flows:
 *  - **All** (no download context): inline "Download · All" → bar shows Web / Full / Cancel →
 *    navigates to the whole-collection download URL.
 *  - **Select** (wrapped in ClientGalleryDownloadProvider): bar shows "N selected" + Download +
 *    Cancel; Download swaps the bar to the Web / Full / Cancel picker → subset download URL.
 *    Deselecting everything while the picker is open auto-backs-out of it.
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

function makeValue(
  overrides: Partial<ClientGalleryDownloadContextValue> = {}
): ClientGalleryDownloadContextValue {
  return {
    isSelectMode: false,
    selectedImageIds: [],
    enterSelectMode: jest.fn(),
    exitSelectMode: jest.fn(),
    ...overrides,
  };
}

function renderWithProvider(
  slug: string,
  overrides: Partial<ClientGalleryDownloadContextValue> = {}
) {
  const value = makeValue(overrides);
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

  it('opens the bottom quality picker on "All" click instead of navigating', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));

    expect(screen.getByRole('button', { name: /^web$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^full$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });

  it('navigates to the web download URL when "Web" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^web$/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'web'));
  });

  it('navigates to the original download URL when "Full" is picked', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^full$/i }));

    expect(window.location.href).toBe(downloadCollectionUrl('smith-wedding', 'original'));
  });

  it('closes the picker after the 4s cooldown', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^web$/i }));

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByRole('button', { name: /^web$/i })).not.toBeInTheDocument();
  });

  it('closes the picker on Cancel and on Escape', () => {
    render(<ClientGalleryDownload collectionSlug="smith-wedding" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('button', { name: /^web$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(screen.queryByRole('button', { name: /^web$/i })).not.toBeInTheDocument();
  });

  it('URL-encodes the slug in the navigation target', () => {
    render(<ClientGalleryDownload collectionSlug="hello world & more" />);
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^web$/i }));

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

  it('shows the action bar with the live count while in select mode', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /^web$/i }));

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

  it('auto-backs-out of the open picker when the selection drops to zero', () => {
    const slug = 'smith-wedding';
    const { rerender } = render(
      <ClientGalleryDownloadProvider
        value={makeValue({ isSelectMode: true, selectedImageIds: [10] })}
      >
        <ClientGalleryDownload collectionSlug={slug} />
      </ClientGalleryDownloadProvider>
    );
    // Open the quality picker.
    fireEvent.click(screen.getByRole('button', { name: /^download$/i }));
    expect(screen.getByRole('button', { name: /^web$/i })).toBeInTheDocument();

    // Deselect the last image — the picker should auto-close back to the count view.
    rerender(
      <ClientGalleryDownloadProvider
        value={makeValue({ isSelectMode: true, selectedImageIds: [] })}
      >
        <ClientGalleryDownload collectionSlug={slug} />
      </ClientGalleryDownloadProvider>
    );

    expect(screen.queryByRole('button', { name: /^web$/i })).not.toBeInTheDocument();
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeDisabled();
  });

  it('the picker shows "Back" (not Cancel) and returns to the count view without leaving select mode', () => {
    const { value } = renderWithProvider('smith-wedding', {
      isSelectMode: true,
      selectedImageIds: [10, 20],
    });
    fireEvent.click(screen.getByRole('button', { name: /^download$/i }));
    expect(screen.getByRole('button', { name: /^web$/i })).toBeInTheDocument();
    // In the Select flow the third button is "Back", not "Cancel".
    expect(screen.getByRole('button', { name: /^back$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

    expect(screen.queryByRole('button', { name: /^web$/i })).not.toBeInTheDocument();
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^download$/i })).toBeInTheDocument();
    expect(value.exitSelectMode).not.toHaveBeenCalled();
  });
});
