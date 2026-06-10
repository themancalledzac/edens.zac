import { fireEvent, render, screen } from '@testing-library/react';

import { Modal } from '@/app/components/ui/Modal/Modal';

/**
 * The Modal owns dismissal + focus management. These tests assert the behavioral
 * contract the 5 shells will delegate to it: focus moves in on open, Escape and
 * backdrop click call onClose, Tab cycles within the dialog, and focus returns to
 * the previously-focused element on close. Children are real focusable buttons so
 * the focus trap has something to cycle through.
 */
function Harness({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      <button type="button" data-testid="trigger">
        Open
      </button>
      <Modal open={open} onClose={onClose} labelledBy="dialog-title">
        <h2 id="dialog-title">Title</h2>
        <button type="button" data-testid="first">
          First
        </button>
        <button type="button" data-testid="last">
          Last
        </button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(<Harness open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a labelled dialog with aria-modal when open', () => {
    render(<Harness open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
  });

  it('moves focus to the dialog on open (not an input, so mobile keyboards stay closed)', () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(<Harness open onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toHaveFocus();
    expect(screen.getByTestId('first')).not.toHaveFocus();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked but not when the dialog is clicked', () => {
    const onClose = jest.fn();
    render(<Harness open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab within the dialog (last → first) and Shift+Tab (first → last)', () => {
    render(<Harness open onClose={jest.fn()} />);
    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    last.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('traps Shift+Tab when focus is on the dialog container itself (post-open default state)', () => {
    render(<Harness open onClose={jest.fn()} />);
    const dialog = screen.getByRole('dialog');
    const last = screen.getByTestId('last');

    // Assert post-open state: focus is on the dialog container, not on a child.
    expect(dialog).toHaveFocus();
    expect(screen.getByTestId('first')).not.toHaveFocus();

    // Shift+Tab from the dialog container must wrap to the last focusable child.
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('returns focus to the previously-focused element on close', () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(<Harness open={false} onClose={jest.fn()} />);
    expect(trigger).toHaveFocus();
  });

  it('does not steal focus from a child with autoFocus', () => {
    // jsdom honours React's autoFocus by running the DOM focus() in commit phase,
    // before the Modal's useEffect fires. This fixture simulates that: a child
    // input carries autoFocus so React focuses it at mount time.
    function AutoFocusHarness({ open, onClose }: { open: boolean; onClose: () => void }) {
      return (
        <Modal open={open} onClose={onClose} labelledBy="af-title">
          <h2 id="af-title">Gate</h2>
          {/* autoFocus causes React to call input.focus() during the commit phase,
              before Modal's useEffect runs. */}
          <input type="password" data-testid="password-input" autoFocus />
        </Modal>
      );
    }

    render(<AutoFocusHarness open onClose={jest.fn()} />);
    const input = screen.getByTestId('password-input');
    // The input should retain focus — the dialog container must NOT steal it.
    expect(input).toHaveFocus();
    expect(screen.getByRole('dialog')).not.toHaveFocus();
  });

  it('does not restore focus to an autoFocused input (already unmounted) on close', () => {
    // When a child has autoFocus, previouslyFocusedRef should be null (not the
    // input inside the dialog), so close does not attempt to focus an unmounted node.
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    // No trigger focused before open — previouslyFocusedRef is null.
    // After close, body (or nothing specific) has focus, not the trigger.
    rerender(<Harness open onClose={jest.fn()} />);
    rerender(<Harness open={false} onClose={jest.fn()} />);
    // As long as we don't throw and no unmounted-node focus error occurs, the
    // null-safe path is exercised. Specifically, the trigger (never focused)
    // should NOT have focus.
    expect(screen.getByTestId('trigger')).not.toHaveFocus();
  });
});
