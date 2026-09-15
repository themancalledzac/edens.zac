import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.skip(
  !email || !password,
  'Set E2E_EMAIL and E2E_PASSWORD (the backend ADMIN_BOOTSTRAP_* values)'
);

test('enrolls a passkey from /admin and signs back in with it', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin$/);

  const passkeyChip = page.getByRole('button', { name: /Face\s*\/\s*Touch ID/ });
  await expect(passkeyChip).toBeVisible();
  await passkeyChip.click();
  await expect(passkeyChip).toHaveCount(0);

  await page.getByRole('button', { name: /menu/i }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email!);
  await page.getByRole('button', { name: 'Sign in with Face / Touch ID' }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
