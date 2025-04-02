import { NextRequest, NextResponse } from 'next/server';

import { isLocalEnvironment } from '@/utils/environment';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/cdn')) {
  }
  if (!isLocalEnvironment()) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/cdn/:path*',
};