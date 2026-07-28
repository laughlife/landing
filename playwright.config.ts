import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required for Playwright tests.')

const parsedTestDatabaseUrl = new URL(testDatabaseUrl)
const databaseName = decodeURIComponent(parsedTestDatabaseUrl.pathname.replace(/^\//, ''))
const allowedDatabaseHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
if (databaseName !== 'wysm_test' || !allowedDatabaseHosts.has(parsedTestDatabaseUrl.hostname)) {
  throw new Error('Playwright tests may only use the local wysm_test database.')
}

const expectedUploadDirectory = resolve('./storage/test-uploads')
const testUploadDirectory = resolve(process.env.TEST_UPLOAD_DIR || expectedUploadDirectory)
if (testUploadDirectory !== expectedUploadDirectory) {
  throw new Error('Playwright tests may only use ./storage/test-uploads.')
}

const baseURL = 'http://127.0.0.1:3101'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 3101',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      UPLOAD_DIR: testUploadDirectory,
      NUXT_PUBLIC_SITE_URL: baseURL
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] }
    }
  ]
})
