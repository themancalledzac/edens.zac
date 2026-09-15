import { defineConfig, devices } from '@playwright/test';

/**
 * Local-only: attaches to the running dev server on 3000 and the docker-compose backend. CI does
 * not run this; it has no backend. `E2E_EMAIL` / `E2E_PASSWORD` are the backend's
 * ADMIN_BOOTSTRAP_* values.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
