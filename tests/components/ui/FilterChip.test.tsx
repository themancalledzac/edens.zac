import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

import { FilterChip } from '@/app/components/ui/FilterChip/FilterChip';

/**
 * `next/link` consumes `scroll` and never puts it on the anchor, so the real component leaves the
 * prop unobservable from the DOM. This passthrough renders the same anchor and parks the value on
 * a data attribute; every other link assertion below (href, aria-current, class) is unaffected.
 */
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    scroll,
    children,
    ...rest
  }: {
    scroll?: boolean;
    children: ReactNode;
    href: string;
  }) => (
    <a {...rest} data-scroll={String(scroll)}>
      {children}
    </a>
  ),
}));

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

  describe('link variant', () => {
    it('renders an anchor when given an href', () => {
      render(<FilterChip label="Saved" href="/user?tab=saved" />);
      const chip = screen.getByRole('link', { name: /saved/i });
      expect(chip).toHaveAttribute('href', '/user?tab=saved');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('marks the active link with aria-current, not aria-pressed', () => {
      // Sections navigate rather than toggle a facet in place, so the accurate ARIA is
      // current-page. aria-pressed on a link would announce it as a toggle button.
      render(<FilterChip label="Saved" href="/user?tab=saved" active />);
      const chip = screen.getByRole('link', { name: /saved/i });
      expect(chip).toHaveAttribute('aria-current', 'page');
      expect(chip).not.toHaveAttribute('aria-pressed');
      expect(chip.className).toMatch(/active/);
    });

    it('omits aria-current when inactive', () => {
      render(<FilterChip label="Saved" href="/user?tab=saved" />);
      expect(screen.getByRole('link', { name: /saved/i })).not.toHaveAttribute('aria-current');
    });

    it('shares the chip styles with the button variant', () => {
      const { unmount } = render(<FilterChip label="Saved" href="/user?tab=saved" />);
      const linkClass = screen.getByRole('link', { name: /saved/i }).className;
      unmount();
      render(<FilterChip label="Saved" onToggle={jest.fn()} />);
      expect(screen.getByRole('button', { name: /saved/i }).className).toBe(linkClass);
    });

    it('renders the count badge like the button variant', () => {
      render(<FilterChip label="Following" count={3} href="/user?tab=following" />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('degrades to an inert span when unavailable (a disabled anchor does not exist)', () => {
      render(<FilterChip label="Saved" href="/user?tab=saved" state="unavailable" />);
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
      expect(screen.getByText('Saved').className).toMatch(/unavailable/);
    });

    it('does not scroll by default, so a ?tab= chip keeps the reader where they were', () => {
      render(<FilterChip label="Saved" href="/user?tab=saved" />);
      expect(screen.getByRole('link', { name: /saved/i })).toHaveAttribute('data-scroll', 'false');
    });

    it('scrolls when asked, for a chip that leaves the page it sits on', () => {
      // A cross-page jump that keeps the old offset lands the reader partway down a page they have
      // never seen. AdminCard's four destinations are the callers that need this.
      render(<FilterChip label="Admin hub" href="/admin" scroll />);
      expect(screen.getByRole('link', { name: /admin hub/i })).toHaveAttribute(
        'data-scroll',
        'true'
      );
    });
  });
});
