/**
 * The backend's reason code for a send it skipped because email is switched off site-wide.
 *
 * `email.enabled` is a Spring property with no DTO or controller behind it, so the flag itself is
 * not readable from here. What every send path DOES return is this literal on `SendResult.reason`
 * — reaching the wire as `ShareEmailResult.reason` and `GalleryAccessResponse.reason` — which
 * makes it the only signal the frontend has that sending is off, and only after a send is tried.
 */
export const EMAIL_DISABLED_REASON = 'email-disabled';

/**
 * Whether a send was skipped because email is switched off, as opposed to having failed.
 *
 * The distinction is what the caller tells the user: a disabled send will not succeed on a retry
 * and needs the link or password passed along by hand, while any other reason might.
 */
export function isEmailDisabled(reason?: string | null): boolean {
  return reason === EMAIL_DISABLED_REASON;
}
