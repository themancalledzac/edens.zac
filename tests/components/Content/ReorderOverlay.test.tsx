/**
 * Tests for ReorderOverlay — the pick-up and cancel controls must be named IconButtons, since they
 * carry only a glyph and so have no visible text of their own.
 */

import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import ReorderOverlay from '@/app/components/Content/ReorderOverlay';

function renderOverlay(overrides: Partial<Parameters<typeof ReorderOverlay>[0]> = {}) {
  const props = {
    isPickedUp: false,
    hasMoved: true,
    isFirst: false,
    isLast: false,
    onArrowLeft: jest.fn(),
    onArrowRight: jest.fn(),
    onPickUp: jest.fn(),
    onPlace: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  render(<ReorderOverlay {...props} />);
  return props;
}

describe('ReorderOverlay', () => {
  it('renders the pick-up control as a named button', () => {
    const props = renderOverlay();
    const button = screen.getByRole('button', { name: /pick up to place elsewhere/i });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-label');
    fireEvent.click(button);
    expect(props.onPickUp).toHaveBeenCalledTimes(1);
  });

  it('renders the cancel control as a named button once the image has moved', () => {
    const props = renderOverlay();
    const button = screen.getByRole('button', { name: /cancel this image's moves/i });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-label');
    fireEvent.click(button);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('omits the cancel control before any move', () => {
    renderOverlay({ hasMoved: false });
    expect(screen.queryByRole('button', { name: /cancel this image's moves/i })).toBeNull();
  });
});
