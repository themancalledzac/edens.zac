import { type NextRequest } from 'next/server';

/**
 * Admin middleware helpers
 *
 * Feature flags and authorization checks for admin routes.
 *
 * Environment variables:
 * - ADMIN_ROUTES_ENABLED: 'true' to allow admin routes outside local/dev
 * - ADMIN_TOKEN: Optional secret. When provided, requests must include either:
 *   - Header: 'x-admin-token: <ADMIN_TOKEN>'
 *   - Cookie: 'admin_token=<ADMIN_TOKEN>'
 */

/**
 * Returns true if admin routes are enabled for non-local environments.
 */
export const isAdminRoutesEnabled = (): boolean => {
  return process.env.ADMIN_ROUTES_ENABLED === 'true';
};

/**
 * Validates admin authorization for a request using a static token.
 *
 * Guard clauses:
 * - If no ADMIN_TOKEN is configured, return true (feature-flag only gating applies)
 * - If ADMIN_TOKEN is set, require header or cookie to match
 */
export const hasValidAdminAuth = (request: NextRequest): boolean => {
  const requiredToken = process.env.ADMIN_TOKEN;
  if (!requiredToken) return true;

  const headerToken = request.headers.get('x-admin-token');
  if (headerToken && headerToken === requiredToken) return true;

  const cookieToken = request.cookies.get('admin_token')?.value;
  return !!(cookieToken && cookieToken === requiredToken);


};
