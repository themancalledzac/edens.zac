import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MeProvider } from '@/app/components/auth/MeProvider';
import { SendMessageButton } from '@/app/components/SendMessageButton/SendMessageButton';
import { type MeResponse } from '@/app/types/Auth';
import * as contactApi from '@/app/utils/contactApi';

jest.mock('@/app/utils/contactApi');

const mockSubmit = contactApi.submitContactMessage as jest.MockedFunction<
  typeof contactApi.submitContactMessage
>;

const me: MeResponse = {
  email: 'user@example.com',
  isAdmin: false,
  mfaSatisfied: true,
  galleries: [],
};

function renderWithMe(principal: MeResponse | null) {
  return render(
    <MeProvider me={principal}>
      <SendMessageButton />
    </MeProvider>
  );
}

describe('SendMessageButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the trigger button and no modal initially', () => {
    renderWithMe(me);
    expect(screen.getByRole('button', { name: /send a message/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the modal with the contact form (email field hidden) on click', () => {
    renderWithMe(me);
    fireEvent.click(screen.getByRole('button', { name: /send a message/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your message')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Your email')).not.toBeInTheDocument();
  });

  it('submits using the signed-in email and keeps the modal open with a confirmation', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    renderWithMe(me);

    fireEvent.click(screen.getByRole('button', { name: /send a message/i }));
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
    renderWithMe(me);
    fireEvent.click(screen.getByRole('button', { name: /send a message/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
