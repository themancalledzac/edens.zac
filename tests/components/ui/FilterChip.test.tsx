import { fireEvent, render, screen } from '@testing-library/react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';

describe('FilterChip', () => {
  it('renders the label as a real button with type="button"', () => {
    render(<FilterChip label="Portland" onToggle={jest.fn()} />);
    const chip = screen.getByRole('button', { name: /portland/i });
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute('type', 'button');
  });

  it('renders the count when provided', () => {
    render(<FilterChip label="Film" count={12} onToggle={jest.fn()} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('omits the count node when count is undefined', () => {
    render(<FilterChip label="Tags" onToggle={jest.fn()} />);
    // The accessible name is just the label — no trailing number.
    const chip = screen.getByRole('button', { name: 'Tags' });
    expect(chip.textContent).toBe('Tags');
  });

  it('reflects active state via aria-pressed and an active class', () => {
    render(<FilterChip label="Film" active onToggle={jest.fn()} />);
    const chip = screen.getByRole('button', { name: /film/i });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip.className).toMatch(/active/);
  });

  it('is aria-pressed="false" when not active', () => {
    render(<FilterChip label="Film" onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: /film/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('is disabled and carries an unavailable class when state="unavailable"', () => {
    render(<FilterChip label="Telephoto" state="unavailable" onToggle={jest.fn()} />);
    const chip = screen.getByRole('button', { name: /telephoto/i });
    expect(chip).toBeDisabled();
    expect(chip.className).toMatch(/unavailable/);
  });

  it('applies a tone class for film/digital tones', () => {
    render(<FilterChip label="Film" tone="film" active onToggle={jest.fn()} />);
    expect(screen.getByRole('button', { name: /film/i }).className).toMatch(/film/);
  });

  it('fires onToggle on click when available', () => {
    const onToggle = jest.fn();
    render(<FilterChip label="Tags" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not fire onToggle when unavailable (disabled button swallows the click)', () => {
    const onToggle = jest.fn();
    render(<FilterChip label="Tags" state="unavailable" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
