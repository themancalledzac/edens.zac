import { EMAIL_DISABLED_REASON, isEmailDisabled } from '@/app/utils/emailSendReason';

/**
 * The reason code is a literal the backend owns and no DTO describes, so the constant is asserted
 * against its wire spelling rather than against itself — a rename on either side has to show up
 * here, which is the only place this repo can notice it.
 */
describe('emailSendReason', () => {
  it('pins the wire spelling the backend sends', () => {
    expect(EMAIL_DISABLED_REASON).toBe('email-disabled');
  });

  it('recognises a send skipped because email is switched off', () => {
    expect(isEmailDisabled('email-disabled')).toBe(true);
  });

  it('treats any other reason as a failure rather than a disabled send', () => {
    expect(isEmailDisabled('ses-rejected')).toBe(false);
    expect(isEmailDisabled('')).toBe(false);
  });

  /**
   * A send that succeeded carries `reason: null`, and a caller that forgets to guard on `sent`
   * must not have `null` read back as "disabled" — the advice differs, so the wrong branch tells
   * the user to go pass the link on by hand after it has already arrived.
   */
  it('does not treat a missing reason as disabled', () => {
    expect(isEmailDisabled(null)).toBe(false);
    expect(isEmailDisabled()).toBe(false);
  });
});
