// This file IS the Next.js middleware. In Next 16 a root `proxy.ts` (formerly
// `middleware.ts`) is the framework convention and runs on every matched request
// in every environment, prod included — it is NOT unwired. It is the page-level
// perimeter for the (admin) route group; the BFF INTERNAL_API_SECRET channel gate
// (app/api/proxy/[...path]/route.ts) authenticates the proxy, not the user, and the
// backend `hasRole('ADMIN')` on the `ezac_session` cookie is authoritative for the API.
import { type NextRequest, NextResponse } from 'next/server';

import { isLocalEnvironment } from '@/app/utils/environment';

/**
 * Global Next.js Proxy
 * - Localhost landing: / redirects to the /admin hub; /homePage is the local-only escape route
 * - Gates the whole (admin) App Router route group on an `ezac_session` cookie
 *   in non-local environments (presence check; the backend validates the session)
 * - Maintains legacy local-only protection for /cdn tooling routes
 * - Feature-flagged legacy /catalog → /collection redirects
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) /homePage is a local-only dev escape hatch (the real home page reachable
  //    from the localhost / → /admin redirect). In non-local it redirects to /
  //    so it is not discoverable.
  if (pathname === '/homePage') {
    if (!isLocalEnvironment()) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 2) On localhost, / → /admin so the dev console is the landing surface.
  //    The real home page remains reachable at /homePage (rule 1, local-only).
  if (isLocalEnvironment() && pathname === '/') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 3) Legacy protection for /cdn tools — allow only in local/dev
  if (pathname.startsWith('/cdn')) {
    if (!isLocalEnvironment()) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4) Feature-flagged redirect from legacy catalog URLs to new collection URLs
  if (pathname.startsWith('/catalog/')) {
    const slug = pathname.split('/')[2] ?? '';
    const redirectsEnabled = process.env.COLLECTION_REDIRECTS_ENABLED === 'true';
    // Do not redirect the legacy create route; only redirect real slugs
    if (redirectsEnabled && slug && slug !== 'create') {
      const url = new URL(request.url);
      url.pathname = `/collection/${slug}`;
      return NextResponse.redirect(url, 308);
    }
  }

  // 5) Admin route group gate. Covers the WHOLE (admin) App Router group (the
  //    group folder does not alter the URL), including the /admin hub and
  //    /admin/users/[id]. Local/dev passes through for fast iteration; every
  //    other environment requires an `ezac_session` cookie (presence check —
  //    the backend validates the session and enforces `isAdmin`).
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/collection/manage' ||
    pathname.startsWith('/collection/manage/') ||
    pathname === '/comments' ||
    pathname.startsWith('/comments/') ||
    pathname === '/metadata' ||
    pathname.startsWith('/metadata/') ||
    pathname === '/all-images' ||
    pathname.startsWith('/all-images/');

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Allow freely in local/dev to speed up iteration.
  if (isLocalEnvironment()) {
    return NextResponse.next();
  }

  // Non-local: require an `ezac_session` cookie. Middleware can only check
  // presence (it can't validate the session); the (admin) layout's
  // requireAdmin() + the backend enforce the actual ADMIN authorization.
  if (!request.cookies.get('ezac_session')?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // The whole (admin) route group + the /homePage escape hatch + the
    // localhost / → /admin redirect. Including '/' here means the middleware
    // runs on every public home page hit; the rule short-circuits in non-local
    // so the prod cost is a single env check.
    // /explore is deliberately PUBLIC (taxonomy directory, chapter 001) — do not
    // add it here; 0203 F4 did and login-walled it in prod.
    // /all-collections is PUBLIC as of 0216 — the backend permission-scopes the
    // list from the ezac_session, so no route-level gate belongs here either.
    '/',
    '/admin',
    '/admin/:path*',
    '/homePage',
    '/catalog/:slug*',
    '/cdn/:path*',
    '/collection/manage',
    '/collection/manage/:path*',
    '/comments',
    '/comments/:path*',
    '/metadata',
    '/metadata/:path*',
    '/all-images',
    '/all-images/:path*',
  ],
};
