'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';

export interface SiteMenuState {
  isOpen: boolean;
  menuId: string;
  toggle: () => void;
  close: () => void;
}

const SiteMenuContext = createContext<SiteMenuState | null>(null);

/**
 * Owns the single open/closed state of the site menu so the header hamburger and the mobile
 * bottom bar's Menu cell drive the same {@link MenuDropdown}.
 */
export function SiteMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const toggle = useCallback(() => setIsOpen(open => !open), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ isOpen, menuId, toggle, close }), [isOpen, menuId, toggle, close]);

  return <SiteMenuContext.Provider value={value}>{children}</SiteMenuContext.Provider>;
}

/** Returns the shared menu state, or null when rendered outside a {@link SiteMenuProvider}. */
export function useSiteMenu(): SiteMenuState | null {
  return useContext(SiteMenuContext);
}
