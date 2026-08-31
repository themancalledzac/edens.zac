/**
 * Tests for ShareCard — the /user block that shows the owner's share link and the controls for
 * sending and revoking it.
 *
 * Mirrors the AccountCard test style: mock the share API and drive each control. The assertions
 * concentrate on the two claims the card must never get wrong — that a failed read is not
 * presented as "you have no link", and that sending to someone does not quietly reset the link
 * out from under whoever already has it.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ShareCard } from '@/app/components/Personal/ShareCard';
import { ApiError } from '@/app/lib/api/core';
import * as shareApi from '@/app/lib/api/share';
import { type CollectionModel } from '@/app/types/Collection';

jest.mock('@/app/lib/api/share', () => ({
  ...jest.requireActual('@/app/lib/api/share'),
  rotateShareLink: jest.fn(),
  emailShareLink: jest.fn(),
  addShareCollection: jest.fn(),
  removeShareCollection: jest.fn(),
}));

const mockRotate = shareApi.rotateShareLink as jest.MockedFunction<typeof shareApi.rotateShareLink>;
const mockEmail = shareApi.emailShareLink as jest.MockedFunction<typeof shareApi.emailShareLink>;
const mockAdd = shareApi.addShareCollection as jest.MockedFunction<
  typeof shareApi.addShareCollection
>;

const collection = (id: number, title: string) =>
  ({ id, title, slug: `c-${id}` }) as unknown as CollectionModel;

function settings(overrides: Partial<shareApi.ShareSettings> = {}): shareApi.ShareSettings {
  return {
    exists: true,
    token: 'tok-123',
    createdAt: null,
    rotatedAt: null,
    lastUsedAt: null,
    optedInCollectionIds: [],
    candidateCollections: [],
    ...overrides,
  };
}

describe('ShareCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /** The whole point: the link is readable on every visit, not only the one that made it. */
  it('shows the live link so it can be sent again without a reset', () => {
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    expect(screen.getByText(`${window.location.origin}/s/tok-123`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  /**
   * A failure says nothing about whether a link exists. Offering "Link to share" here would read
   * as "you have none" to someone whose link is out there working.
   */
  it('does not offer to create a link when the read failed', () => {
    render(<ShareCard read={{ ok: false }} />);

    expect(screen.queryByRole('button', { name: /link to share/i })).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
  });

  /** The paragraph that used to explain what a share link is has gone; the button carries it. */
  it('offers to create one only when the read genuinely says there is none', () => {
    render(<ShareCard read={{ ok: true, settings: null }} />);

    expect(screen.getByRole('button', { name: /link to share/i })).toBeInTheDocument();
    expect(screen.queryByText(/no account or password/i)).not.toBeInTheDocument();
  });

  /** Sending to a second person must never cut off the first. */
  it('emails the existing link without minting a new one', async () => {
    mockEmail.mockResolvedValue({ sent: true, reason: null });
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => expect(mockEmail).toHaveBeenCalledWith('mum@example.com'));
    expect(mockRotate).not.toHaveBeenCalled();
    expect(await screen.findByText(/sent to mum@example.com/i)).toBeInTheDocument();
  });

  it('says so plainly when email is switched off, rather than claiming it sent', async () => {
    mockEmail.mockResolvedValue({ sent: false, reason: 'email-disabled' });
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/email is not switched on/i)).toBeInTheDocument();
  });

  /**
   * A send can fail for reasons that have nothing to do with the site-wide switch, and telling the
   * owner email is off when it is on sends them chasing a setting that is already correct. Only
   * the `email-disabled` reason earns that sentence.
   */
  it('does not blame the email switch for a send that failed some other way', async () => {
    mockEmail.mockResolvedValue({ sent: false, reason: 'ses-rejected' });
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/did not go out/i)).toBeInTheDocument();
    expect(screen.queryByText(/email is not switched on/i)).not.toBeInTheDocument();
  });

  it('replaces the displayed link after a reset', async () => {
    mockRotate.mockResolvedValue(settings({ token: 'tok-new' }));
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.click(screen.getByRole('button', { name: /reset link/i }));

    expect(await screen.findByText(`${window.location.origin}/s/tok-new`)).toBeInTheDocument();
  });

  /** A gallery someone else let them into is not theirs to pass on by default. */
  it('offers granted galleries as opt-ins, unchecked by default', async () => {
    mockAdd.mockResolvedValue();
    render(
      <ShareCard
        read={{
          ok: true,
          settings: settings({ candidateCollections: [collection(9, 'Someone Else Wedding')] }),
        }}
      />
    );

    const box = screen.getByRole('checkbox', { name: /someone else wedding/i });
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(9));
  });

  it('surfaces a link that cannot be shown as a reset prompt, not an error', () => {
    render(<ShareCard read={{ ok: true, settings: settings({ token: null }) }} />);

    expect(screen.getByText(/reset it to get one you can copy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset link/i })).toBeInTheDocument();
  });

  it('explains an expired session rather than a generic failure', async () => {
    mockRotate.mockRejectedValue(new ApiError('nope', 401));
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.click(screen.getByRole('button', { name: /reset link/i }));

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  /**
   * Asserts on "re-shown", not the shared closing sentence: the token-null hint ends in the same
   * "reset it to get one you can copy", so a regex on that tail passes even if `mapError` never
   * runs. This is the branch the backend explicitly cares about. The generic fallback is ruled
   * out separately because it reads as transient, and a retry never succeeds for this link.
   */
  it('names the pre-V58 link problem on a 409 rather than offering a retry', async () => {
    mockEmail.mockRejectedValue(new ApiError('conflict', 409));
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/before links could be re-shown/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not send that email/i)).not.toBeInTheDocument();
  });

  /**
   * The limiter (backend #233) runs BEFORE `revealToken`, so a 429 and a 409 can never describe
   * the same request — and the link is provably untouched when one arrives. The copy has to say
   * "wait", and must not send the sender to Reset, which would cut off whoever holds the link
   * over a limit that clears on its own.
   */
  it('tells a rate-limited sender to wait, rather than blaming the link', async () => {
    mockEmail.mockRejectedValue(new ApiError('too many requests', 429));
    render(<ShareCard read={{ ok: true, settings: settings() }} />);

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/too many share emails/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not send that email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reset it to get one you can copy/i)).not.toBeInTheDocument();
  });

  it('explains a lost gallery grant on a 403 rather than a generic failure', async () => {
    mockAdd.mockRejectedValue(new ApiError('forbidden', 403));
    render(
      <ShareCard
        read={{
          ok: true,
          settings: settings({ candidateCollections: [collection(9, 'Someone Else Wedding')] }),
        }}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /someone else wedding/i }));

    expect(await screen.findByText(/no longer have access to that gallery/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not update what your link shows/i)).not.toBeInTheDocument();
  });
});
