import { redirect } from 'next/navigation';

import { meServer } from '@/app/lib/api/auth';

/**
 * Admin authorization helpers.
 *
 * Page-group gating now runs in two places: the `proxy.ts` middleware performs an
 * `ezac_session` presence check on the whole (admin) route group, and
 * {@link requireAdmin} (below) enforces the actual `isAdmin` flag server-side. The
 * old `ADMIN_TOKEN` / `ADMIN_ROUTES_ENABLED` static-token mechanism was retired
 * with the session model and has been removed.
 */

/**
 * Admin gate (SERVER-SIDE). Resolves the acting principal via {@link meServer}
 * and redirects logged-in-but-not-admin (and anonymous) users to `/login`.
 * Called by the (admin) layout and the `?manage`/edit gate in `app/[slug]`.
 *
 * `meServer()` returns null for anonymous requests (a 401 from `/api/auth/me`), which
 * maps to `redirect('/login')` just like a logged-in non-admin. It would ALSO return
 * null if somehow invoked outside a request scope (no cookie to forward → the backend
 * still gets hit, cookie-less, and 401s the same way) — but that never happens here:
 * every (admin) page is `force-dynamic`, so this only runs per-request, never during
 * static generation.
 *
 * Admin-ness comes from the row-level `isAdmin` flag, NOT session identity, so an
 * admin impersonating another user retains access.
 */
export async function requireAdmin(): Promise<void> {
  const principal = await meServer();
  if (!principal || !principal.isAdmin) {
    redirect('/login');
  }
}
