import { useEffect } from 'react';

/**
 * Custom hook to handle Escape key presses.
 * Attaches a `keydown` listener on `document` while `enabled` is true,
 * invokes `onEscape` when the user presses the Escape key, and removes
 * the listener on cleanup / when `enabled` flips false / on unmount.
 *
 * @param onEscape - Callback invoked when Escape is pressed
 * @param enabled  - Whether the listener should be active (default: true)
 *
 * @example
 * useEscapeKey(() => setIsOpen(false), isOpen);
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onEscape, enabled]);
}
