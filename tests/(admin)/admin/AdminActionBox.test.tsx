import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import * as actions from '@/app/(admin)/admin/actions';
import AdminActionBox from '@/app/(admin)/admin/AdminActionBox';
import { collectionStorage } from '@/app/lib/storage/collectionStorage';

// Factory mock prevents the real actions module from loading next/cache,
// which references Request/TextEncoder at module init and breaks under jsdom.
jest.mock('@/app/(admin)/admin/actions', () => ({
  clearCacheAction: jest.fn(),
}));
jest.mock('@/app/lib/storage/collectionStorage', () => ({
  collectionStorage: { clearAll: jest.fn() },
}));

const mockClearCache = actions.clearCacheAction as jest.MockedFunction<
  typeof actions.clearCacheAction
>;
const mockClearAll = collectionStorage.clearAll as jest.MockedFunction<
  typeof collectionStorage.clearAll
>;

describe('AdminActionBox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('on success: invokes server action, clears local storage, shows success message', async () => {
    mockClearCache.mockResolvedValue({ ok: true });

    render(<AdminActionBox />);
    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }));

    await waitFor(() => {
      expect(screen.getByText(/cache cleared/i)).toBeInTheDocument();
    });
    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  it('on failure: shows error message, does NOT clear local storage', async () => {
    mockClearCache.mockResolvedValue({ ok: false, error: 'boom' });

    render(<AdminActionBox />);
    fireEvent.click(screen.getByRole('button', { name: /clear cache/i }));

    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
    expect(mockClearAll).not.toHaveBeenCalled();
  });
});
