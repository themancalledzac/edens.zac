import { type NextRequest, NextResponse } from 'next/server';

import { hasValidAdminAuth, isAdminRoutesEnabled } from '@/app/utils/admin';
import { isLocalEnvironment } from '@/app/utils/environment';

/**
 * Global Next.js Proxy
 * - Local-only admin hub at /admin (and /homePage escape route)
 * - Protects admin App Router routes (create/edit collections)
 * - Maintains legacy local-only protection for /cdn tooling routes
 * - Supports feature flags and simple token-based authorization for gradual rollout
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Local-only admin hub. /admin* and /homePage are dev-console paths;
  //    in non-local environments they redirect to / so they are not discoverable.
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/homePage') {
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

  // 5) Admin routes protection (App Router group (admin) does not alter URL)
  const isAdminRoute =
    pathname === '/collection/manage' ||
    pathname.startsWith('/collection/manage/') ||
    /\/collection\/.+\/edit$/.test(pathname) ||
    pathname === '/comments' ||
    pathname.startsWith('/comments/') ||
    pathname === '/metadata' ||
    pathname.startsWith('/metadata/');

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Allow freely in local/dev to speed up iteration
  if (isLocalEnvironment()) {
    return NextResponse.next();
  }

  // In non-local environments, require feature flag and optional auth
  if (!isAdminRoutesEnabled()) {
    return new NextResponse('Admin features are disabled', { status: 403 });
  }

  if (!hasValidAdminAuth(request)) {
    // Optional: indicate auth requirement via header for debugging
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Admin hub (local-only) and the localhost / → /admin redirect.
    // Including '/' here means the middleware runs on every public home
    // page hit; the rule short-circuits in non-local so the prod cost is
    // a single env check.
    '/',
    '/admin',
    '/admin/:path*',
    '/homePage',
    '/catalog/:slug*',
    '/cdn/:path*',
    '/collection/manage',
    '/collection/manage/:path*',
    '/collection/:slug/edit',
    '/comments',
    '/comments/:path*',
    '/metadata',
    '/metadata/:path*',
  ],
};
