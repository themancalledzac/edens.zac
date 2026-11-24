/**
 * Full-page browser navigation to `url`. Kept in its own module so tests can `jest.mock` it:
 * jsdom marks `window.location` unforgeable, so a test cannot stub or spy on `location.href`.
 */
export function navigateTo(url: string): void {
  window.location.href = url;
}
