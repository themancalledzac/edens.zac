import { fireEvent, render, screen } from '@testing-library/react';

import { CloseButton } from '@/app/components/ui/CloseButton/CloseButton';

describe('CloseButton', () => {
  it('defaults its accessible name to "Close"', () => {
    render(<CloseButton />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('accepts a custom aria-label', () => {
    render(<CloseButton aria-label="Dismiss dialog" />);
    expect(screen.getByRole('button', { name: 'Dismiss dialog' })).toBeInTheDocument();
  });

  it('forwards onClick', () => {
    const onClick = jest.fn();
    render(<CloseButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
