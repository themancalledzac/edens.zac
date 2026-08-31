/**
 * @jest-environment node
 *
 * `CDN_ORIGIN` duplicates `next.config.js`'s `CLOUDFRONT_HOST` — that file cannot be imported from
 * `app/` without pulling the bundle analyzer into the client bundle. If the two drift, the `<head>`
 * preconnects to a host nothing then requests, warming an unused connection while the real origin
 * stays cold.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CDN_ORIGIN } from '@/app/constants';

const config = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');

function readCloudfrontHost(): string {
  const match = /const CLOUDFRONT_HOST = '([^']+)';/.exec(config);
  expect(match).not.toBeNull();
  return match?.[1] ?? '';
}

describe('CDN_ORIGIN', () => {
  it('names the same host next.config.js allows through the image optimizer', () => {
    expect(CDN_ORIGIN).toBe(`https://${readCloudfrontHost()}`);
  });

  it('is an origin, with no trailing path — preconnect takes nothing else', () => {
    expect(CDN_ORIGIN).toMatch(/^https:\/\/[^/]+$/);
  });

  it('is the host the CSP lets images load from', () => {
    expect(config).toContain("img-src 'self' blob: data: https://${CLOUDFRONT_HOST}");
  });

  it('is the host the image optimizer allows as a remote pattern', () => {
    expect(config).toMatch(/hostname:\s*CLOUDFRONT_HOST/);
  });
});
