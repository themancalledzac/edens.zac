/** @jest-environment node */
/**
 * Unit tests for navigateTo. Runs in the node environment with a plain `window` stub, because
 * jsdom's `location` cannot be replaced or observed without a real navigation.
 */

import { navigateTo } from '@/app/utils/navigateTo';

describe('navigateTo', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'window', {
      value: { location: { href: 'https://example.com/start' } },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('assigns the URL to window.location.href', () => {
    navigateTo('https://example.com/download?format=web');

    expect(window.location.href).toBe('https://example.com/download?format=web');
  });
});
