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
import { type CollectionModel } from '@/app/types/Collection';
import { CollectionVisibility } from '@/app/types/CollectionVisibility';

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
    isClient: true,
    isBlog: false,
    locations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    visibility: CollectionVisibility.LISTED,
    isPasswordProtected: true,
    ...overrides,
  };
}

/**
 * A `validateClientGalleryAccess` that parks in the verifying state until `settle()` is called, so
 * a test can inspect the form mid-request.
 */
function deferredValidate() {
  let resolveValidate!: (value: { hasAccess: boolean }) => void;
  mockValidate.mockImplementation(
    () =>
      new Promise(resolve => {
        resolveValidate = resolve;
      })
  );
  return { settle: (value: { hasAccess: boolean }) => resolveValidate(value) };
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

  it('marks the submit button aria-disabled while a request is in-flight', async () => {
    const { settle } = deferredValidate();

    render(<ClientGalleryGate collection={makeCollection()} />);

    fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
      target: { value: 'pw' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verifying/i })).toHaveAttribute(
        'aria-disabled',
        'true'
      );
    });

    settle({ hasAccess: true });
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  /**
   * The gate lives inside a `Modal`, so a control that drops focus on the way into its pending
   * state drops it onto `<body>` — outside the dialog, from where one Tab walks the page the
   * password is protecting. Neither control may use the real `disabled` attribute.
   */
  describe('verifying state keeps focus inside the dialog', () => {
    it('leaves the password field focusable and focused — readOnly, not disabled', async () => {
      const { settle } = deferredValidate();

      render(<ClientGalleryGate collection={makeCollection()} />);
      const input = screen.getByPlaceholderText('Gallery password') as HTMLInputElement;
      input.focus();
      fireEvent.change(input, { target: { value: 'pw' } });

      fireEvent.submit(input.closest('form')!);

      await waitFor(() => expect(input).toHaveAttribute('readonly'));

      // A disabled field is not a focusable area, so this is the assertion that fails if the
      // verifying state ever goes back to the real attribute and drops focus onto <body>.
      expect(input).not.toBeDisabled();
      expect(input).toHaveFocus();

      settle({ hasAccess: false });
      await waitFor(() => expect(input).not.toHaveAttribute('readonly'));
    });

    it('keeps the typed password in the field while it is being checked', async () => {
      const { settle } = deferredValidate();

      render(<ClientGalleryGate collection={makeCollection()} />);
      const input = screen.getByPlaceholderText('Gallery password') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'pw' } });
      fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

      await waitFor(() => expect(input).toHaveAttribute('readonly'));
      expect(input.value).toBe('pw');
      expect(mockValidate).toHaveBeenCalledWith('smith-wedding', 'pw');

      settle({ hasAccess: false });
      await waitFor(() => expect(input.value).toBe(''));
    });

    it('leaves the submit button focusable while pending', async () => {
      const { settle } = deferredValidate();

      render(<ClientGalleryGate collection={makeCollection()} />);
      fireEvent.change(screen.getByPlaceholderText('Gallery password'), {
        target: { value: 'pw' },
      });
      fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

      const button = await screen.findByRole('button', { name: /verifying/i });
      expect(button).not.toBeDisabled();

      // A `disabled` button is not a focusable area: this is the assertion that fails if the
      // pending state ever goes back to dropping focus on <body>, outside the dialog.
      button.focus();
      expect(button).toHaveFocus();

      settle({ hasAccess: false });
      await waitFor(() => expect(button).not.toHaveAttribute('aria-disabled'));
    });

    it('ignores a repeat submit while the first is in flight instead of double-posting', async () => {
      const { settle } = deferredValidate();

      render(<ClientGalleryGate collection={makeCollection()} />);
      const input = screen.getByPlaceholderText('Gallery password') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'pw' } });
      fireEvent.click(screen.getByRole('button', { name: /enter gallery/i }));

      await waitFor(() => expect(mockValidate).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: /verifying/i }));
      fireEvent.submit(input.closest('form')!);

      expect(mockValidate).toHaveBeenCalledTimes(1);

      settle({ hasAccess: false });
      await waitFor(() =>
        expect(screen.getByText('Incorrect password. Please try again.')).toBeInTheDocument()
      );
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
