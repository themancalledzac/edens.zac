import { redirect } from 'next/navigation';

import { meServer } from '@/app/lib/api/auth';
import { isLocalEnvironment } from '@/app/utils/environment';

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
 * Admin-ness comes from the row-level `isAdmin` flag, NOT session identity.
 *
 * LOCAL/DEV IS OPEN, and this function was the last thing pretending otherwise. Every other
 * layer of the local stack already serves admin anonymously and says so in as many words:
 * `proxy.ts` returns `NextResponse.next()` for the whole (admin) group when
 * {@link isLocalEnvironment} ("Allow freely in local/dev to speed up iteration"); the BFF
 * proxy's anonymous-admin reject is gated on `NODE_ENV === 'production'` and its comment
 * reads "dev is unaffected (localhost admin has no login)"; and the local backend answers
 * `/api/admin/users`, `/api/admin/roles` and `/api/admin/messages` with 200 and real rows to
 * a request carrying no cookie at all. Only `/api/auth/me` 401s locally — so `meServer()`
 * returned null, and this redirected to `/login` a developer whose next click would have been
 * served anonymously anyway. That inconsistency is what made `/admin` unreachable to anything
 * without a hand-driven browser login, agents included.
 *
 * The bypass cannot reach a deployed environment. `isLocalEnvironment()` is
 * `NEXT_PUBLIC_ENV === 'local' || NODE_ENV === 'development'`; a production build sets
 * `NODE_ENV=production`, and `NEXT_PUBLIC_ENV` is inlined at build time from the deploy's own
 * env. Under `next build` this branch is dead and the `meServer()` gate below is the only path.
 * It is also invisible to the test suite, which runs at `NODE_ENV=test` — the redirect
 * behaviour stays pinned there, and is pinned explicitly for production in `admin.test.ts`.
 */
export async function requireAdmin(): Promise<void> {
  if (isLocalEnvironment()) return;

  const principal = await meServer();
  if (!principal || !principal.isAdmin) {
    redirect('/login');
  }
}
