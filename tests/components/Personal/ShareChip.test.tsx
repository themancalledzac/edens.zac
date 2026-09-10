/**
 * Tests for ShareChip — the /user chip that opens a dialog with the owner's share link and the
 * controls for sending and revoking it.
 *
 * Mock the share API and the canonical Modal, open the dialog, and drive each control. The
 * assertions concentrate on the two claims the chip must never get wrong — that a failed read is
 * not presented as "you have no link", and that sending to someone does not quietly reset the
 * link out from under whoever already has it.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ShareChip } from '@/app/components/Personal/ShareChip';
import { ApiError } from '@/app/lib/api/core';
import * as shareApi from '@/app/lib/api/share';
import { type CollectionModel } from '@/app/types/Collection';

jest.mock('@/app/components/ui/Modal/Modal', () => ({
  Modal: ({ open, children }: { open: boolean; children: unknown }) => (open ? children : null),
}));

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

const openShare = () => fireEvent.click(screen.getByRole('button', { name: 'Share' }));

describe('ShareChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers a single Share chip that opens a dialog', () => {
    render(<ShareChip read={{ ok: true, settings: null }} />);
    const trigger = screen.getByRole('button', { name: 'Share' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('heading', { name: 'Share' })).not.toBeInTheDocument();
    openShare();
    expect(screen.getByRole('heading', { name: 'Share' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create link' })).toBeInTheDocument();
  });

  it('labels the recipient field for autofill', () => {
    render(<ShareChip read={{ ok: true, settings: settings({ token: 't' }) }} />);
    openShare();
    const input = screen.getByRole('textbox', { name: 'Send the link to this email address' });
    expect(input).toHaveAttribute('name', 'recipientEmail');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  it('shows the live link so it can be sent again without a reset', () => {
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    expect(screen.getByText(`${window.location.origin}/s/tok-123`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('does not offer to create a link when the read failed', () => {
    render(<ShareChip read={{ ok: false }} />);
    openShare();

    expect(screen.queryByRole('button', { name: /create link/i })).not.toBeInTheDocument();
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
  });

  it('offers to create one only when the read genuinely says there is none', () => {
    render(<ShareChip read={{ ok: true, settings: null }} />);
    openShare();

    expect(screen.getByRole('button', { name: /create link/i })).toBeInTheDocument();
    expect(screen.queryByText(/no account or password/i)).not.toBeInTheDocument();
  });

  it('emails the existing link without minting a new one', async () => {
    mockEmail.mockResolvedValue({ sent: true, reason: null });
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

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
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/email is not switched on/i)).toBeInTheDocument();
  });

  it('does not blame the email switch for a send that failed some other way', async () => {
    mockEmail.mockResolvedValue({ sent: false, reason: 'ses-rejected' });
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/did not go out/i)).toBeInTheDocument();
    expect(screen.queryByText(/email is not switched on/i)).not.toBeInTheDocument();
  });

  it('replaces the displayed link after a reset', async () => {
    mockRotate.mockResolvedValue(settings({ token: 'tok-new' }));
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    fireEvent.click(screen.getByRole('button', { name: /reset link/i }));

    expect(await screen.findByText(`${window.location.origin}/s/tok-new`)).toBeInTheDocument();
  });

  it('offers granted galleries as opt-ins, unchecked by default', async () => {
    mockAdd.mockResolvedValue();
    render(
      <ShareChip
        read={{
          ok: true,
          settings: settings({ candidateCollections: [collection(9, 'Someone Else Wedding')] }),
        }}
      />
    );
    openShare();

    const box = screen.getByRole('checkbox', { name: /someone else wedding/i });
    expect(box).not.toBeChecked();

    fireEvent.click(box);
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(9));
  });

  it('surfaces a link that cannot be shown as a reset prompt, not an error', () => {
    render(<ShareChip read={{ ok: true, settings: settings({ token: null }) }} />);
    openShare();

    expect(screen.getByText(/reset it to get one you can copy/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset link/i })).toBeInTheDocument();
  });

  it('explains an expired session rather than a generic failure', async () => {
    mockRotate.mockRejectedValue(new ApiError('nope', 401));
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    fireEvent.click(screen.getByRole('button', { name: /reset link/i }));

    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
  });

  it('names the pre-V58 link problem on a 409 rather than offering a retry', async () => {
    mockEmail.mockRejectedValue(new ApiError('conflict', 409));
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

    fireEvent.change(screen.getByLabelText(/send the link to this email/i), {
      target: { value: 'mum@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(await screen.findByText(/before links could be re-shown/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not send that email/i)).not.toBeInTheDocument();
  });

  it('tells a rate-limited sender to wait, rather than blaming the link', async () => {
    mockEmail.mockRejectedValue(new ApiError('too many requests', 429));
    render(<ShareChip read={{ ok: true, settings: settings() }} />);
    openShare();

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
      <ShareChip
        read={{
          ok: true,
          settings: settings({ candidateCollections: [collection(9, 'Someone Else Wedding')] }),
        }}
      />
    );
    openShare();

    fireEvent.click(screen.getByRole('checkbox', { name: /someone else wedding/i }));

    expect(await screen.findByText(/no longer have access to that gallery/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not update what your link shows/i)).not.toBeInTheDocument();
  });
});
