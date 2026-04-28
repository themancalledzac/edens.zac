import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ContactForm } from '@/app/components/ContactForm/ContactForm';
import * as contactApi from '@/app/utils/contactApi';

jest.mock('@/app/utils/contactApi');

const mockSubmit = contactApi.submitContactMessage as jest.MockedFunction<
  typeof contactApi.submitContactMessage
>;

describe('ContactForm', () => {
  const defaultProps = { onBack: jest.fn(), onSubmit: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email input, message textarea, and send button', () => {
    render(<ContactForm {...defaultProps} />);
    expect(screen.getByPlaceholderText('Your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^send$/i })).toBeInTheDocument();
  });

  it('email input has type="email" and maxLength=320', () => {
    render(<ContactForm {...defaultProps} />);
    const input = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.maxLength).toBe(320);
  });

  it('calls submitContactMessage with email and message on submit', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        message: 'Hello!',
      })
    );
  });

  it('shows success banner and calls onSubmit on 201', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Message sent!')).toBeInTheDocument();
    });
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('clears form inputs after successful submission', async () => {
    mockSubmit.mockResolvedValue({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    render(<ContactForm {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText('Your email') as HTMLInputElement;
    const messageInput = screen.getByPlaceholderText('Your message') as HTMLTextAreaElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Hello!' } });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(emailInput.value).toBe('');
      expect(messageInput.value).toBe('');
    });
  });

  it('disables button and shows "Sending..." during submission', async () => {
    let resolveCall!: (v: contactApi.ContactResult) => void;
    mockSubmit.mockImplementation(
      () =>
        new Promise<contactApi.ContactResult>(resolve => {
          resolveCall = resolve;
        })
    );
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled());

    await act(async () => {
      resolveCall({ ok: true, id: 1, createdAt: '2026-04-19T10:00:00Z' });
    });
  });

  it('shows rate-limit message without mailto link on 429', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'rate-limit',
      message:
        'Whoa — too many messages from your network in the last hour. Please try again later.',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Whoa — too many messages from your network in the last hour. Please try again later.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('shows validation error without mailto link on 400', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'validation',
      message: 'Invalid email address',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('shows server error message without link', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'server',
      message: 'Something went wrong. Please try again in a bit.',
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(
        screen.getByText('Something went wrong. Please try again in a bit.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('shows network error message without link', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      code: 'network',
      message: "Couldn't reach the server. Please try again in a bit.",
    });
    render(<ContactForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Your email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'Hello!' },
    });
    fireEvent.submit(screen.getByRole('form'));

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't reach the server. Please try again in a bit.")
      ).toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  it('renders character counter showing length under 4500', () => {
    render(<ContactForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'x'.repeat(4499) },
    });
    expect(screen.getByText('4499 / 5000')).toBeInTheDocument();
    const counter = screen.getByText('4499 / 5000');
    expect(counter).not.toHaveClass('charCounterWarn');
  });

  it('character counter goes red at 4500+ chars', () => {
    render(<ContactForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'x'.repeat(4501) },
    });
    expect(screen.getByText('4501 / 5000')).toBeInTheDocument();
    const counter = screen.getByText('4501 / 5000');
    expect(counter).toHaveClass('charCounterWarn');
  });

  it('submit button disabled when message is empty', () => {
    render(<ContactForm {...defaultProps} />);
    const button = screen.getByRole('button', { name: /^send$/i });
    expect(button).toBeDisabled();
  });

  it('submit button disabled when message exceeds 5000', () => {
    render(<ContactForm {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Your message'), {
      target: { value: 'x'.repeat(5001) },
    });
    const button = screen.getByRole('button', { name: /^send$/i });
    expect(button).toBeDisabled();
  });

  it('textarea has maxLength=5000', () => {
    render(<ContactForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText('Your message') as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(5000);
  });

  it('does not show any banner or link in idle state', () => {
    render(<ContactForm {...defaultProps} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText(/message sent/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
