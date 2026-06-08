import { type RefObject, useEffect } from 'react';

import { useEscapeKey } from '@/app/hooks/useEscapeKey';

/**
 * Custom hook to handle click outside and escape key events
 * Commonly used for dropdowns, modals, and other dismissible UI elements
 *
 * @param ref - React ref to the container element
 * @param isOpen - Boolean indicating if the element is currently open/visible
 * @param onClose - Callback function to close/dismiss the element
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const [isOpen, setIsOpen] = useState(false);
 *
 * useClickOutside(containerRef, isOpen, () => setIsOpen(false));
 *
 * return (
 *   <div ref={containerRef}>
 *     {isOpen && <Dropdown />}
 *   </div>
 * );
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void
): void {
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, isOpen, onClose]);
}

/**
 * Hook variant that accepts multiple open states
 * Useful when a component has multiple dismissible elements (e.g., dropdown AND add-new form)
 *
 * @param ref - React ref to the container element
 * @param isOpenStates - Array of boolean states, closes if ANY are true
 * @param onClose - Callback function to close/dismiss all elements
 *
 * @example
 * useClickOutsideMultiple(
 *   containerRef,
 *   [isDropdownOpen, isAddNewOpen],
 *   () => {
 *     setIsDropdownOpen(false);
 *     setIsAddNewOpen(false);
 *   }
 * );
 */
export function useClickOutsideMultiple(
  ref: RefObject<HTMLElement | null>,
  isOpenStates: boolean[],
  onClose: () => void
): void {
  const isAnyOpen = isOpenStates.some(Boolean);
  useClickOutside(ref, isAnyOpen, onClose);
}
