import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'ciclo.spec.ts',
  workers: 1,
  use: {
    baseURL,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Requiere una compilación previa (`npm run build`): `next start` falla si no existe.
  webServer: {
    command: 'npm run start -- --hostname 127.0.0.1',
    url: baseURL,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
})
