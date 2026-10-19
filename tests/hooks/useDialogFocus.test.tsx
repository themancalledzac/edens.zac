import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';

import { type DialogFocusOptions, useDialogFocus } from '@/app/hooks/useDialogFocus';

interface HarnessProps {
  open: boolean;
  onClose: () => void;
  options?: DialogFocusOptions;
  withInput?: boolean;
}

/** Minimal dialog wired to the hook, with a header whose first control is the restore fallback. */
function Harness({ open, onClose, options, withInput = false }: HarnessProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { onKeyDown } = useDialogFocus(ref, open, onClose, options);
  return (
    <>
      <header>
        <button type="button">home</button>
      </header>
      <nav data-bar>
        <button type="button">bar link</button>
        <button type="button">bar close</button>
      </nav>
      {open && (
        <div ref={ref} role="dialog" tabIndex={-1} onKeyDown={onKeyDown} data-testid="dialog">
          <button type="button">first</button>
          {withInput && <input aria-label="auto" autoFocus />}
          <button type="button">last</button>
        </div>
      )}
    </>
  );
}

describe('useDialogFocus', () => {
  afterEach(() => {
    document.body.className = '';
    document.body.style.top = '';
  });

  describe('focus trap', () => {
    it('wraps Tab from the last control to the first', () => {
      render(<Harness open onClose={jest.fn()} />);
      screen.getByText('last').focus();
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab' });
      expect(screen.getByText('first')).toHaveFocus();
    });

    it('wraps Shift+Tab from the first control to the last', () => {
      render(<Harness open onClose={jest.fn()} />);
      screen.getByText('first').focus();
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab', shiftKey: true });
      expect(screen.getByText('last')).toHaveFocus();
    });

    it('wraps Shift+Tab from the container to the last control', () => {
      render(<Harness open onClose={jest.fn()} />);
      expect(screen.getByTestId('dialog')).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab', shiftKey: true });
      expect(screen.getByText('last')).toHaveFocus();
    });

    it('does not intercept Tab between inner controls', () => {
      render(<Harness open onClose={jest.fn()} />);
      screen.getByText('first').focus();
      const notPrevented = fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab' });
      expect(notPrevented).toBe(true);
      expect(screen.getByText('first')).toHaveFocus();
    });
  });

  describe('Escape', () => {
    it('closes from the dialog keydown and stops propagation by default', () => {
      const onClose = jest.fn();
      const outer = jest.fn();
      document.addEventListener('keydown', outer);
      render(<Harness open onClose={onClose} />);
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Escape' });
      document.removeEventListener('keydown', outer);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(outer).not.toHaveBeenCalled();
    });

    it('does not listen on document in dialog mode', () => {
      const onClose = jest.fn();
      render(<Harness open onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes from document in document mode', () => {
      const onClose = jest.fn();
      render(<Harness open onClose={onClose} options={{ escape: 'document' }} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ignores isComposing Escape in document mode', () => {
      const onClose = jest.fn();
      render(<Harness open onClose={onClose} options={{ escape: 'document' }} />);
      fireEvent.keyDown(document, { key: 'Escape', isComposing: true });
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not listen on document while closed', () => {
      const onClose = jest.fn();
      render(<Harness open={false} onClose={onClose} options={{ escape: 'document' }} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('focus on open and restore', () => {
    it('focuses the container on open', () => {
      render(<Harness open onClose={jest.fn()} />);
      expect(screen.getByTestId('dialog')).toHaveFocus();
    });

    it('lets an autoFocused child keep focus by default', () => {
      render(<Harness open onClose={jest.fn()} withInput />);
      expect(screen.getByLabelText('auto')).toHaveFocus();
    });

    it('always focuses the container when respectAutoFocus is false', () => {
      render(<Harness open onClose={jest.fn()} withInput options={{ respectAutoFocus: false }} />);
      expect(screen.getByTestId('dialog')).toHaveFocus();
    });

    it('restores focus to the trigger on close', () => {
      const trigger = document.createElement('button');
      document.body.append(trigger);
      trigger.focus();
      const { rerender } = render(<Harness open onClose={jest.fn()} />);
      expect(trigger).not.toHaveFocus();
      rerender(<Harness open={false} onClose={jest.fn()} />);
      expect(trigger).toHaveFocus();
      trigger.remove();
    });

    it('falls back to the first control in <header> when the trigger left the document', () => {
      const trigger = document.createElement('button');
      document.body.append(trigger);
      trigger.focus();
      const { rerender } = render(<Harness open onClose={jest.fn()} />);
      trigger.remove();
      rerender(<Harness open={false} onClose={jest.fn()} />);
      expect(screen.getByText('home')).toHaveFocus();
    });
  });

  describe('scroll lock', () => {
    it('locks body scroll while open and releases on close', () => {
      const { rerender } = render(<Harness open onClose={jest.fn()} />);
      expect(document.body).toHaveClass('scroll-locked');
      rerender(<Harness open={false} onClose={jest.fn()} />);
      expect(document.body).not.toHaveClass('scroll-locked');
    });
  });

  describe('alsoTabbable', () => {
    const options = { alsoTabbable: '[data-bar] button' };
    let rects: jest.SpyInstance;

    beforeEach(() => {
      rects = jest
        .spyOn(HTMLElement.prototype, 'getClientRects')
        .mockReturnValue([{}] as unknown as DOMRectList);
    });

    afterEach(() => rects.mockRestore());

    it('lets Tab leave the last dialog control for the outside controls', () => {
      render(<Harness open onClose={jest.fn()} options={options} />);
      screen.getByText('last').focus();
      const notPrevented = fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab' });
      expect(notPrevented).toBe(true);
    });

    it('wraps Tab from the last outside control back to the first dialog control', () => {
      render(<Harness open onClose={jest.fn()} options={options} />);
      const barClose = screen.getByText('bar close');
      barClose.focus();
      fireEvent.keyDown(barClose, { key: 'Tab' });
      expect(screen.getByText('first')).toHaveFocus();
    });

    it('sends Shift+Tab from the first dialog control to the last outside control', () => {
      render(<Harness open onClose={jest.fn()} options={options} />);
      screen.getByText('first').focus();
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab', shiftKey: true });
      expect(screen.getByText('bar close')).toHaveFocus();
    });

    it('ignores outside controls that are not rendered', () => {
      rects.mockReturnValue([] as unknown as DOMRectList);
      render(<Harness open onClose={jest.fn()} options={options} />);
      screen.getByText('last').focus();
      fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Tab' });
      expect(screen.getByText('first')).toHaveFocus();
    });
  });
});
