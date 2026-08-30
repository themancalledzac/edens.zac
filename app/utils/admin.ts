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
 * LOCAL/DEV IS OPEN AT THE FRONTEND, and this function was the last frontend layer pretending
 * otherwise: `proxy.ts` passes the whole (admin) group through when {@link isLocalEnvironment},
 * and the BFF proxy's anonymous-admin reject is production-only. Gating here redirected an
 * anonymous local developer to `/login` before either mattered.
 *
 * The BACKEND is a separate perimeter and is not open — `/api/admin/**` requires `hasRole('ADMIN')`
 * in every profile since backend #243. So the local admin shell renders while its data 401s until
 * a real session exists. That is the backend gate working, not a frontend layer to loosen.
 *
 * What scopes the bypass is the BUILD's env, not the host it runs on. `isLocalEnvironment()` is
 * `NEXT_PUBLIC_ENV === 'local' || NODE_ENV === 'development'`; `next build` sets
 * `NODE_ENV=production`, so the first half is the whole question — and `NEXT_PUBLIC_ENV` is
 * inlined at build time from the deploy's own env. A deploy that does not set it to `local` gets
 * a dead branch and the `meServer()` gate below as its only path, which is the intended and the
 * normal case. A deploy that DOES set it ships this bypass with it, so treat `NEXT_PUBLIC_ENV` in
 * a deploy's build env as a security-relevant setting rather than a label.
 *
 * What that misconfiguration would cost is bounded, because no other layer takes its word for it.
 * `proxy.ts` reads the same predicate, so the admin SHELL would render for an anonymous visitor —
 * but the DATA behind it would not follow: the BFF's anonymous-admin reject keys off
 * `NODE_ENV === 'production'` (unaffected by `NEXT_PUBLIC_ENV`), and the backend enforces
 * `hasRole('ADMIN')` on `/api/admin/**` regardless of what the frontend believes. An empty console,
 * not an open one.
 *
 * The bypass is invisible to the test suite, which runs at `NODE_ENV=test` — the redirect
 * behaviour stays pinned there, and is pinned explicitly for production in `admin.test.ts`.
 */
export async function requireAdmin(): Promise<void> {
  if (isLocalEnvironment()) return;

  const principal = await meServer();
  if (!principal || !principal.isAdmin) {
    redirect('/login');
  }
}
