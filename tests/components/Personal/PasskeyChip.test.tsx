import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PASSKEY_LABEL, PasskeyChip } from '@/app/components/Personal/PasskeyChip';
import * as authApi from '@/app/lib/api/auth';
import { ApiError } from '@/app/lib/api/core';

jest.mock('@/app/lib/api/auth', () => ({ registerPasskey: jest.fn() }));

const mockRegisterPasskey = authApi.registerPasskey as jest.MockedFunction<
  typeof authApi.registerPasskey
>;
const chip = () => screen.getByRole('button', { name: PASSKEY_LABEL });

describe('PasskeyChip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders nothing for an account that already has a passkey', () => {
    const { container } = render(<PasskeyChip initiallyEnrolled />);
    expect(container).toBeEmptyDOMElement();
  });

  it('offers the chip, with a non-breaking label, when no passkey exists', () => {
    render(<PasskeyChip initiallyEnrolled={false} />);
    expect(chip()).toBeEnabled();
    expect(PASSKEY_LABEL).toBe('Face / Touch ID');
  });

  it('is a plain action button, not a toggle: no aria-pressed', () => {
    render(<PasskeyChip initiallyEnrolled={false} />);
    expect(chip()).not.toHaveAttribute('aria-pressed');
  });

  it('disables the chip while the ceremony is pending, then removes it and announces success', async () => {
    let finish!: () => void;
    mockRegisterPasskey.mockReturnValue(
      new Promise<void>(resolve => {
        finish = resolve;
      })
    );
    render(<PasskeyChip initiallyEnrolled={false} />);
    const button = chip();
    fireEvent.click(button);
    expect(button).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Face / Touch ID added.');
  });

  it.each([
    [new DOMException('closed', 'NotAllowedError'), 'Prompt closed. Try again.'],
    [new DOMException('rp', 'SecurityError'), 'Not available on this site.'],
    [new ApiError('expired', 401), 'Session expired. Sign in again.'],
    [new Error('boom'), "Couldn't save. Try again."],
  ])('maps %p to a short alert and keeps the chip', async (error, copy) => {
    mockRegisterPasskey.mockRejectedValue(error);
    render(<PasskeyChip initiallyEnrolled={false} />);
    fireEvent.click(chip());
    expect(await screen.findByRole('alert')).toHaveTextContent(copy);
    expect(chip()).toBeEnabled();
  });

  it('clears error on successful retry', async () => {
    mockRegisterPasskey.mockRejectedValueOnce(new Error('first attempt fails'));
    render(<PasskeyChip initiallyEnrolled={false} />);
    const button = chip();
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save. Try again.");
    expect(button).toBeEnabled();

    mockRegisterPasskey.mockResolvedValueOnce();
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Face / Touch ID added.');
  });
});
