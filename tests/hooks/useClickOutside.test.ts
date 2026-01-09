/**
 * Tests for useClickOutside and useClickOutsideMultiple hooks
 *
 * Testing Strategy:
 *
 * useClickOutside:
 * - Should call onClose when clicking outside the ref element
 * - Should NOT call onClose when clicking inside the ref element
 * - Should call onClose when pressing Escape key
 * - Should NOT call onClose for other key presses
 * - Should NOT attach listeners when isOpen is false
 * - Should attach listeners when isOpen is true
 * - Should remove listeners on cleanup/unmount
 * - Should remove listeners when isOpen changes to false
 * - Should handle null ref gracefully
 *
 * useClickOutsideMultiple:
 * - Should call onClose when any state is true and clicking outside
 * - Should NOT call onClose when all states are false
 * - Should work correctly with mixed true/false states
 */

import { act, renderHook } from '@testing-library/react';

import { useClickOutside, useClickOutsideMultiple } from '@/app/hooks/useClickOutside';

describe('useClickOutside', () => {
  let mockOnClose: jest.Mock;
  let containerElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    mockOnClose = jest.fn();

    // Create DOM elements for testing
    containerElement = document.createElement('div');
    containerElement.setAttribute('data-testid', 'container');
    document.body.appendChild(containerElement);

    outsideElement = document.createElement('div');
    outsideElement.setAttribute('data-testid', 'outside');
    document.body.appendChild(outsideElement);
  });

  afterEach(() => {
    // Clean up DOM
    document.body.removeChild(containerElement);
    document.body.removeChild(outsideElement);
    jest.clearAllMocks();
  });

  describe('Click outside behavior', () => {
    it('should call onClose when clicking outside the ref element', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      // Simulate click outside
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when clicking inside the ref element', () => {
      const ref = { current: containerElement };

      // Add a child element to click on
      const childElement = document.createElement('button');
      containerElement.appendChild(childElement);

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      // Simulate click inside (on the container)
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        containerElement.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();

      // Simulate click inside (on a child element)
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        childElement.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should NOT call onClose when clicking on document body but ref is null', () => {
      const ref = { current: null };

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      // Simulate click on body
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        document.body.dispatchEvent(event);
      });

      // Should not crash and should not call onClose when ref is null
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape key behavior', () => {
    it('should call onClose when pressing Escape key', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      // Simulate Escape key press
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose for other key presses', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      // Simulate other key presses
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('isOpen state behavior', () => {
    it('should NOT attach listeners when isOpen is false', () => {
      const ref = { current: containerElement };
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(ref, false, mockOnClose));

      // Should not have added mousedown or keydown listeners
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should attach listeners when isOpen is true', () => {
      const ref = { current: containerElement };
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useClickOutside(ref, true, mockOnClose));

      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should NOT call onClose when isOpen is false even if click occurs', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutside(ref, false, mockOnClose));

      // Simulate click outside
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should remove listeners when isOpen changes from true to false', () => {
      const ref = { current: containerElement };
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { rerender } = renderHook(
        ({ isOpen }) => useClickOutside(ref, isOpen, mockOnClose),
        { initialProps: { isOpen: true } }
      );

      // Change isOpen to false
      rerender({ isOpen: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Cleanup behavior', () => {
    it('should remove listeners on unmount', () => {
      const ref = { current: containerElement };
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useClickOutside(ref, true, mockOnClose));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should not call onClose after unmount', () => {
      const ref = { current: containerElement };

      const { unmount } = renderHook(() => useClickOutside(ref, true, mockOnClose));

      unmount();

      // Simulate click outside after unmount
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      // Should not have been called because listeners were removed
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Callback stability', () => {
    it('should work correctly when onClose callback changes', () => {
      const ref = { current: containerElement };
      const firstOnClose = jest.fn();
      const secondOnClose = jest.fn();

      const { rerender } = renderHook(
        ({ onClose }) => useClickOutside(ref, true, onClose),
        { initialProps: { onClose: firstOnClose } }
      );

      // Click outside with first callback
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(firstOnClose).toHaveBeenCalledTimes(1);
      expect(secondOnClose).not.toHaveBeenCalled();

      // Change callback
      rerender({ onClose: secondOnClose });

      // Click outside with second callback
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(firstOnClose).toHaveBeenCalledTimes(1); // Still 1
      expect(secondOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useClickOutsideMultiple', () => {
  let mockOnClose: jest.Mock;
  let containerElement: HTMLDivElement;
  let outsideElement: HTMLDivElement;

  beforeEach(() => {
    mockOnClose = jest.fn();

    containerElement = document.createElement('div');
    document.body.appendChild(containerElement);

    outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
  });

  afterEach(() => {
    document.body.removeChild(containerElement);
    document.body.removeChild(outsideElement);
    jest.clearAllMocks();
  });

  describe('Multiple state handling', () => {
    it('should call onClose when first state is true and clicking outside', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [true, false, false], mockOnClose));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when last state is true and clicking outside', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [false, false, true], mockOnClose));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when multiple states are true', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [true, true, false], mockOnClose));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onClose when all states are false', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [false, false, false], mockOnClose));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle empty array (all false equivalent)', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [], mockOnClose));

      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should respond to Escape key when any state is true', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [false, true], mockOnClose));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT respond to Escape key when all states are false', () => {
      const ref = { current: containerElement };

      renderHook(() => useClickOutsideMultiple(ref, [false, false], mockOnClose));

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('State transitions', () => {
    it('should activate listeners when state changes from all-false to some-true', () => {
      const ref = { current: containerElement };

      const { rerender } = renderHook(
        ({ states }) => useClickOutsideMultiple(ref, states, mockOnClose),
        { initialProps: { states: [false, false] } }
      );

      // Should not respond when all false
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });
      expect(mockOnClose).not.toHaveBeenCalled();

      // Change to have one true
      rerender({ states: [true, false] });

      // Should now respond
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should deactivate listeners when state changes from some-true to all-false', () => {
      const ref = { current: containerElement };

      const { rerender } = renderHook(
        ({ states }) => useClickOutsideMultiple(ref, states, mockOnClose),
        { initialProps: { states: [true, false] } }
      );

      // Should respond when some true
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Change to all false
      rerender({ states: [false, false] });

      // Should no longer respond
      act(() => {
        const event = new MouseEvent('mousedown', { bubbles: true });
        outsideElement.dispatchEvent(event);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });
});
