import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/acceptance',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright' }],
    ['junit', { outputFile: 'reports/playwright-junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Service Worker-t engedélyezzük a tesztekben
        serviceWorkers: 'allow',
      },
    },
  ],
  webServer: process.env['CI']
    ? {
        // CI: serve the pre-built production bundle (fast, no ng serve needed)
        command: 'npx serve dist/fittracker/browser -p 4200 --single',
        url: 'http://localhost:4200',
        timeout: 30_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : {
        // Local dev: use the Angular dev server (live reload, no pre-build needed)
        command: 'npm start -- --no-open',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
