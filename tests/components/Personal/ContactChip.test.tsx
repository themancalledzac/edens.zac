import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { ContactChip } from '@/app/components/Personal/ContactChip';
import { type MeResponse } from '@/app/types/Auth';
import * as contactApi from '@/app/utils/contactApi';

jest.mock('@/app/utils/contactApi');

const mockSubmit = contactApi.submitContactMessage as jest.MockedFunction<
  typeof contactApi.submitContactMessage
>;

const principal: MeResponse = {
  email: 'user@example.com',
  isAdmin: false,
  mfaSatisfied: true,
  passkeyCount: 0,
  galleries: [],
};

function renderWithMe(me: MeResponse | null) {
  return render(
    <MeProvider me={me}>
      <ContactChip />
    </MeProvider>
  );
}

describe('ContactChip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is a chip that opens a dialog titled Contact the Photographer', () => {
    render(
      <MeProvider me={principal}>
        <ContactChip />
      </MeProvider>
    );
    const trigger = screen.getByRole('button', { name: 'Contact' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('heading', { name: 'Contact the Photographer' })).toBeInTheDocument();
  });

  it('names the chip Contact rather than the recipient', () => {
    renderWithMe(principal);
    expect(screen.getByRole('button', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the modal with the contact form (email field hidden) on click', () => {
    renderWithMe(principal);
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your message')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your email')).not.toBeInTheDocument();
  });

  it('submits using the signed-in email and keeps the modal open with a confirmation', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    renderWithMe(principal);

    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith({ email: 'user@example.com', message: 'Hello!' })
    );
    expect(screen.getByText('Message sent!')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal via the close button', () => {
    renderWithMe(principal);
    fireEvent.click(screen.getByRole('button', { name: 'Contact' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
