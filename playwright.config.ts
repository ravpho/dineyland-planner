import { defineConfig, devices } from '@playwright/test'

const port = 4173

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}/`,
    trace: 'retain-on-failure',
  },
  // *.phone.spec.ts run at 390x844 with touch, *.desktop.spec.ts at 1280x800, *.common.spec.ts in both.
  projects: [
    { name: 'phone', testMatch: /\.(phone|common)\.spec\.ts$/, use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', testMatch: /\.(desktop|common)\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
