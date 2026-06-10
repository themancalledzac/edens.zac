'use client';

import { useEffect } from 'react';

/**
 * Forces manual scroll-restoration while any (admin) route is mounted.
 *
 * Admin surfaces (notably the manage page) fetch their content client-side
 * after mount, so the document is ~1 viewport tall on first paint and only
 * grows once the BoxTree grid renders. With the browser default
 * `scrollRestoration: 'auto'`, a full reload restores the pre-reload offset
 * against that asynchronously-growing page and parks the viewport on the global
 * <Footer/> at the bottom of <body>. Setting 'manual' makes every full reload
 * start at the top instead. The prior mode is restored when leaving the admin
 * subtree so the public site keeps native restoration. Renders nothing.
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
