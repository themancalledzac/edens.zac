import { type NextRequest, NextResponse } from 'next/server';

import { hasValidAdminAuth,isAdminRoutesEnabled } from '@/app/utils/admin';
import { isLocalEnvironment } from '@/app/utils/environment';

/**
 * Global Next.js Proxy
 * - Protects admin App Router routes (create/edit collections)
 * - Maintains legacy local-only protection for /cdn tooling routes
 * - Supports feature flags and simple token-based authorization for gradual rollout
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1) Legacy protection for /cdn tools — allow only in local/dev
  if (pathname.startsWith('/cdn')) {
    if (!isLocalEnvironment()) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 2) Feature-flagged redirect from legacy catalog URLs to new collection URLs
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

  // 3) Admin routes protection (App Router group (admin) does not alter URL)
  const isAdminRoute =
    pathname === '/collection/create' || /\/collection\/.+\/edit$/.test(pathname);

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
    return new NextResponse('Unauthorized', { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="admin"' } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/cdn/:path*',
    '/collection/create',
    '/collection/:slug/edit',
    '/catalog/:slug*',
  ],
};
