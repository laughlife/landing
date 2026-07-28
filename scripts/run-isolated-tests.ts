import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { config } from 'dotenv'

config({ path: resolve('.env'), quiet: true })
config({ path: resolve('.env.test.local'), override: true, quiet: true })

const mode = process.argv[2]
if (mode !== 'deploy' && mode !== 'seed' && mode !== 'integration' && mode !== 'e2e') {
  throw new Error('Usage: tsx scripts/run-isolated-tests.ts <deploy|seed|integration|e2e>')
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL is required.')

let databaseUrl: URL
try {
  databaseUrl = new URL(testDatabaseUrl)
} catch {
  throw new Error('TEST_DATABASE_URL must be a valid MySQL URL.')
}

const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''))
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
if (databaseUrl.protocol !== 'mysql:' || databaseName !== 'wysm_test' || !allowedHosts.has(databaseUrl.hostname)) {
  throw new Error('Isolated tests may only use the local MySQL database named wysm_test.')
}

const projectRoot = resolve('.')
const expectedUploadDirectory = resolve(projectRoot, 'storage/test-uploads')
const testUploadDirectory = resolve(process.env.TEST_UPLOAD_DIR || expectedUploadDirectory)
if (testUploadDirectory !== expectedUploadDirectory) {
  throw new Error('Isolated tests may only use ./storage/test-uploads.')
}
mkdirSync(testUploadDirectory, { recursive: true })

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const args = mode === 'deploy'
  ? ['exec', 'prisma', 'migrate', 'deploy']
  : mode === 'seed'
    ? ['exec', 'prisma', 'db', 'seed']
    : mode === 'integration'
      ? ['exec', 'vitest', 'run', '--project', 'integration', '--sequence.concurrent', 'false']
      : ['exec', 'playwright', 'test']
const result = spawnSync(pnpm, args, {
  cwd: projectRoot,
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl,
    UPLOAD_DIR: testUploadDirectory
  },
  stdio: 'inherit'
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
