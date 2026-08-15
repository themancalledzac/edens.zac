'use client';

import { useEffect } from 'react';

import { plantShareCookie } from '@/app/lib/api/share';
import { logger } from '@/app/utils/logger';

export interface ShareSessionProps {
  /** The raw token from the URL. Never rendered — only exchanged for the cookie. */
  token: string;
}

/**
 * Plants the share cookie for a link that has just been opened, so the recipient keeps their view
 * while walking around the rest of the site instead of being confined to this page.
 *
 * Renders nothing. It exists because a Server Component cannot set cookies: the page above SSRs
 * the view from the token directly, and this fires once on mount to have the backend issue the
 * cookie (the BFF proxy forwards its `Set-Cookie` through). Re-declaring the cookie's attributes
 * in a Server Action instead would put HttpOnly / SameSite / max-age in a second place that could
 * drift from the backend that owns them.
 *
 * The cost is one extra request on the first landing only — every later visit is served from the
 * cookie. A failure is logged and swallowed: the page the visitor asked for is already rendered
 * above, and the link in their messages keeps working, so an error banner would report a problem
 * they do not have.
 */
export function ShareSession({ token }: ShareSessionProps) {
  useEffect(() => {
    let cancelled = false;
    plantShareCookie(token).catch((error: unknown) => {
      if (!cancelled) {
        // The token is deliberately not included — it is a bearer credential.
        logger.error('share', 'Could not start the share session', error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return null;
}
