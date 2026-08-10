import { fireEvent, render, screen } from '@testing-library/react';

import { IconButton } from '@/app/components/ui/IconButton/IconButton';

describe('IconButton', () => {
  it('renders a button named by its required aria-label', () => {
    render(
      <IconButton aria-label="Open menu">
        <svg data-testid="icon" />
      </IconButton>
    );
    const btn = screen.getByRole('button', { name: 'Open menu' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('applies shape and variant classes', () => {
    render(
      <IconButton aria-label="Close" shape="round" variant="overlay">
        <span>x</span>
      </IconButton>
    );
    const btn = screen.getByRole('button', { name: 'Close' });
    expect(btn.className).toMatch(/round/);
    expect(btn.className).toMatch(/overlay/);
  });

  it('is disabled and aria-busy while loading', () => {
    render(
      <IconButton aria-label="Saving" loading>
        <span>x</span>
      </IconButton>
    );
    const btn = screen.getByRole('button', { name: 'Saving' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  /**
   * The primitive paints `aria-disabled` the same as `disabled` (see `IconButton.module.scss`), so
   * a dismiss or overlay control inside a focus trap can go inert without the browser dropping its
   * focus onto `<body>`. See the fuller note in the `Button` suite.
   */
  it('carries aria-disabled without the real attribute, and stays focusable', () => {
    render(
      <IconButton aria-label="Close" aria-disabled>
        <span>x</span>
      </IconButton>
    );
    const btn = screen.getByRole('button', { name: 'Close' });

    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn).not.toBeDisabled();

    btn.focus();
    expect(btn).toHaveFocus();
  });

  it('forwards onClick', () => {
    const onClick = jest.fn();
    render(
      <IconButton aria-label="Go" onClick={onClick}>
        <span>x</span>
      </IconButton>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
