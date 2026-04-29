/**
 * Tests for ClientGalleryGate.
 *
 * The gate is mounted by `CollectionPageWrapper` only when the viewer is
 * unauthenticated for a password-protected CLIENT_GALLERY (i.e. the SSR fetch
 * returned `content: null`). It owns the password form, the verifying/unlocking
 * states, and the error branching — but it does NOT render the gallery itself;
 * the wrapper unmounts it after a successful unlock and routes to
 * `<CollectionPage>` instead. These tests cover that contract.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ClientGalleryGate from '@/app/components/ClientGalleryGate/ClientGalleryGate';
import * as collectionsApi from '@/app/lib/api/collections';
import { ApiError } from '@/app/lib/api/core';
import { type CollectionModel, CollectionType } from '@/app/types/Collection';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock('@/app/lib/api/collections', () => ({
  validateClientGalleryAccess: jest.fn(),
}));

const mockValidate = collectionsApi.validateClientGalleryAccess as jest.MockedFunction<
  typeof collectionsApi.validateClientGalleryAccess
>;

function makeCollection(overrides: Partial<CollectionModel> = {}): CollectionModel {
  return {
    id: 1,
    slug: 'smith-wedding',
    title: 'Smith Wedding',
    type: CollectionType.CLIENT_GALLERY,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visible: true,
    isPasswordProtected: true,
    ...overrides,
  };
}

describe('ClientGalleryGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not touch sessionStorage at all', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(<ClientGalleryGate collection={makeCollection()} />);

    expect(getItemSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('renders the password form on mount', () => {
    render(<ClientGalleryGate collection={makeCollection()} />);

    expect(screen.getByPlaceholderText('Gallery password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter gallery/i })).toBeInTheDocument();
  });

  it('shows inline error when submitting an empty password', async () => {
    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a password.')).toBeInTheDocument();
    });
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('calls router.refresh() and switches to the loading state on hasAccess: true', async () => {
    mockValidate.mockResolvedValue({ hasAccess: true });

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(mockValidate).toHaveBeenCalledWith('smith-wedding', 'correct-password');
    });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
    // The gate now shows the loading state. The wrapper will unmount it once
    // router.refresh() returns a populated collection — in production the
    // user never sees the form again. In the test there's no wrapper, so we
    // assert the loading UI is shown instead of the form.
    expect(screen.getByText(/loading gallery/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Gallery password')).not.toBeInTheDocument();
  });

  it('shows incorrect-password message and clears input on hasAccess: false', async () => {
    mockValidate.mockResolvedValue({ hasAccess: false });

    render(<ClientGalleryGate collection={makeCollection()} />);

    const input = screen.getByPlaceholderText('Gallery password') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument();
    });
    expect(input.value).toBe('');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows the rate-limit message on ApiError 429 without clearing input', async () => {
    mockValidate.mockRejectedValue(new ApiError('Too Many Requests', 429));

    render(<ClientGalleryGate collection={makeCollection()} />);

    const input = screen.getByPlaceholderText('Gallery password') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Too many attempts. Please wait 15 minutes and try again.')
      ).toBeInTheDocument();
    });
    expect(input.value).toBe('pw');
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows the access-denied message on ApiError 403 (FE-I2)', async () => {
    mockValidate.mockRejectedValue(new ApiError('Forbidden', 403));

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Access denied. Please contact the gallery owner.')
      ).toBeInTheDocument();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows the gallery-not-found message on ApiError 404 (FE-I2)', async () => {
    mockValidate.mockRejectedValue(new ApiError('Gallery not found', 404));

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Gallery not found. Check the URL and try again.')
      ).toBeInTheDocument();
    });
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('shows the generic API error message on other ApiError statuses (e.g. 500)', async () => {
    mockValidate.mockRejectedValue(new ApiError('Server error', 500));

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Unable to verify access. Please try again later.')
      ).toBeInTheDocument();
    });
  });

  it('shows the network-error message on a non-ApiError exception (FE-I2)', async () => {
    mockValidate.mockRejectedValue(new Error('Network down'));

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Network error. Please check your connection and try again.')
      ).toBeInTheDocument();
    });
  });

  it('disables the submit button while a request is in-flight', async () => {
    let resolve!: (value: { hasAccess: boolean }) => void;
    mockValidate.mockImplementation(
      () =>
        new Promise(r => {
          resolve = r;
        })
    );

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verifying/i })).toBeDisabled();
    });

    resolve({ hasAccess: true });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('drops the unlocking spinner and surfaces an error after the failsafe timeout', async () => {
    jest.useFakeTimers();
    mockValidate.mockResolvedValue({ hasAccess: true });

    try {
      render(<ClientGalleryGate collection={makeCollection()} />);

      fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
        target: { value: 'pw' },
      });
      fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

      // Drain microtasks so the validate promise + state updates flush.
      await act(async () => {
        await Promise.resolve();
      });
      expect(screen.getByText(/loading gallery/i)).toBeInTheDocument();

      // Advance past the 5s failsafe; the spinner should disappear and the
      // form should re-render with an explanatory error.
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(screen.queryByText(/loading gallery/i)).not.toBeInTheDocument();
      expect(
        screen.getByText(
          /verified, but the gallery did not load\. please refresh the page or contact the gallery owner\./i
        )
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Gallery password')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
