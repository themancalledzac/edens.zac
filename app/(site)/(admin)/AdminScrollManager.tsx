'use client';

import { useEffect } from 'react';

/**
 * Sets `scrollRestoration: 'manual'` while any admin route is mounted and restores
 * the previous mode on unmount. Needed because admin pages grow asynchronously after
 * mount; `'auto'` would restore a stale offset against the not-yet-rendered grid.
 * Renders nothing.
 */
export function AdminScrollManager(): null {
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  return null;
}
