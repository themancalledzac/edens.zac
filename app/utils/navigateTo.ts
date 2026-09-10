/**
 * Send the browser to `url` by assigning `window.location.href`.
 *
 * One line behind one function so it can be replaced in a test. Downloads navigate rather than
 * fetch — see {@link useDownloadNavigation} for why — and jsdom makes `window.location`
 * non-configurable, so a suite cannot stub the assignment in place. Mocking this module is what
 * lets the download suites assert the URL without driving a real navigation.
 */
export function navigateTo(url: string): void {
  window.location.href = url;
}
