import { defineConfig, devices } from '@playwright/test'
import { loadEnv } from 'vite'

const mode = process.env.MODE ?? 'development'
const env = loadEnv(mode, process.cwd(), '')

for (const [key, value] of Object.entries(env)) {
  process.env[key] ??= value
}

const host = process.env.E2E_HOST ?? 'localhost'
const port = process.env.E2E_PORT ?? '5173'
const baseURL = process.env.E2E_BASE_URL ?? `http://${host}:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm dev -- --host ${host} --port ${port} --strictPort`,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === 'true',
    timeout: 120_000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
