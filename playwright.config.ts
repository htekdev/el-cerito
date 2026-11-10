import { defineConfig, devices } from '@playwright/test';

const preview = process.env.PLAYWRIGHT_TEST_BASE_URL;
const local = 'http://127.0.0.1:4328';

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: preview || local,
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
  ],
  webServer: preview ? undefined : {
    command: 'node scripts/serve-dist.mjs',
    url: local,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
