/**
 * Tests for useEscapeKey hook
 *
 * Testing Strategy:
 *
 * - Should call onEscape when Escape key is pressed
 * - Should NOT call onEscape for other key presses
 * - Should NOT attach listener when enabled is false
 * - Should attach listener when enabled is true (default)
 * - Should remove listener on unmount
 * - Should remove listener when enabled changes from true to false
 * - Should re-subscribe when enabled toggles from false to true
 */

import { act, renderHook } from '@testing-library/react';

import { useEscapeKey } from '@/app/hooks/useEscapeKey';

describe('useEscapeKey', () => {
  let mockOnEscape: jest.Mock;

  beforeEach(() => {
    mockOnEscape = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Escape key behavior', () => {
    it('should call onEscape when Escape key is pressed', () => {
      renderHook(() => useEscapeKey(mockOnEscape, true));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(mockOnEscape).toHaveBeenCalledTimes(1);
    });

    it('should NOT call onEscape for other key presses', () => {
      renderHook(() => useEscapeKey(mockOnEscape, true));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      });

      expect(mockOnEscape).not.toHaveBeenCalled();
    });

    it('should call onEscape using default enabled=true when no second arg is provided', () => {
      renderHook(() => useEscapeKey(mockOnEscape));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(mockOnEscape).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled gating', () => {
    it('should NOT attach listener when enabled is false', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useEscapeKey(mockOnEscape, false));

      expect(addEventListenerSpy).not.toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should attach listener when enabled is true', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');

      renderHook(() => useEscapeKey(mockOnEscape, true));

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should NOT call onEscape when enabled is false even if Escape is pressed', () => {
      renderHook(() => useEscapeKey(mockOnEscape, false));

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(mockOnEscape).not.toHaveBeenCalled();
    });

    it('should remove listener when enabled changes from true to false', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { rerender } = renderHook(({ enabled }) => useEscapeKey(mockOnEscape, enabled), {
        initialProps: { enabled: true },
      });

      rerender({ enabled: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should re-subscribe when enabled toggles from false to true', () => {
      const { rerender } = renderHook(({ enabled }) => useEscapeKey(mockOnEscape, enabled), {
        initialProps: { enabled: false },
      });

      // No calls while disabled
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(mockOnEscape).not.toHaveBeenCalled();

      // Enable the hook
      rerender({ enabled: true });

      // Now Escape should fire
      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(mockOnEscape).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup behavior', () => {
    it('should remove listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderHook(() => useEscapeKey(mockOnEscape, true));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should not call onEscape after unmount', () => {
      const { unmount } = renderHook(() => useEscapeKey(mockOnEscape, true));

      unmount();

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(mockOnEscape).not.toHaveBeenCalled();
    });
  });
});
