import { fireEvent, render, screen } from '@testing-library/react';

import { Button } from '@/app/components/ui/Button/Button';

describe('Button', () => {
  it('renders children and defaults to type="button"', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="sm">
        Delete
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/danger/);
    expect(btn.className).toMatch(/sm/);
  });

  it('supports the outline variant', () => {
    render(<Button variant="outline">More</Button>);
    expect(screen.getByRole('button', { name: 'More' }).className).toMatch(/outline/);
  });

  it('renders a warning variant', () => {
    render(<Button variant="warning">Remove</Button>);
    const btn = screen.getByRole('button', { name: 'Remove' });
    expect(btn.className).toMatch(/warning/);
  });

  it('is disabled and aria-busy while loading', () => {
    render(<Button loading>Saving</Button>);
    const btn = screen.getByRole('button', { name: /saving/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('forwards onClick', () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * A control that has to survive its own pending state carries `aria-disabled` instead of
   * `disabled`, because disabling the focused element hands focus to `<body>` — and inside a focus
   * trap, one Tab from there walks the page behind the dialog. The primitive owes those callers the
   * same painted state the real attribute gets, so they do not each restate it locally.
   *
   * jest maps CSS modules to an identity proxy, so the stylesheet itself is out of reach here;
   * these cover the half that is testable — the attribute contract the stylesheet keys off, and the
   * focusability that is the whole reason for the swap.
   */
  describe('aria-disabled', () => {
    it('stays focusable, because the real attribute is what drops focus', () => {
      render(<Button aria-disabled>Verifying…</Button>);
      const btn = screen.getByRole('button', { name: /verifying/i });

      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(btn).not.toBeDisabled();

      btn.focus();
      expect(btn).toHaveFocus();
    });

    it('keeps its variant class, so the primitive paints the pending look off the attribute', () => {
      const { rerender } = render(<Button variant="primary">Enter</Button>);
      const btn = screen.getByRole('button', { name: 'Enter' });
      const idle = btn.className;

      rerender(
        <Button variant="primary" aria-disabled>
          Enter
        </Button>
      );

      expect(btn.className).toBe(idle);
      expect(btn).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not swallow the click — the caller owns the guard, not the primitive', () => {
      const onClick = jest.fn();
      render(
        <Button aria-disabled onClick={onClick}>
          Verifying…
        </Button>
      );

      fireEvent.click(screen.getByRole('button', { name: /verifying/i }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('omits the attribute entirely when not pending', () => {
      render(<Button aria-disabled={undefined}>Enter</Button>);
      expect(screen.getByRole('button', { name: 'Enter' })).not.toHaveAttribute('aria-disabled');
    });
  });

  it('respects an explicit type and merges a custom className', () => {
    render(
      <Button type="submit" className="custom-x">
        Submit
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Submit' });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn.className).toMatch(/custom-x/);
  });
});
