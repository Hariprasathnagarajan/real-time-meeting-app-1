import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['camera', 'microphone'],
    ...devices['Desktop Chrome'],
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--allow-file-access-from-files',
      ],
    },
  },
  webServer: {
    command: 'TURSO_CONNECTION_URL=file:playwright.db BETTER_AUTH_SECRET=playwright-test-secret BETTER_AUTH_URL=http://127.0.0.1:3000 npm run dev',
    url: 'http://127.0.0.1:3000/auth',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
