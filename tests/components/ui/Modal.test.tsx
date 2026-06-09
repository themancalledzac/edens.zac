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

  it('returns focus to the previously-focused element on close', () => {
    const { rerender } = render(<Harness open={false} onClose={jest.fn()} />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();

    rerender(<Harness open onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toHaveFocus();

    rerender(<Harness open={false} onClose={jest.fn()} />);
    expect(trigger).toHaveFocus();
  });
});
