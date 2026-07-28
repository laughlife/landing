const testDatabaseUrl = process.env.TEST_DATABASE_URL
if (!testDatabaseUrl || process.env.DATABASE_URL !== testDatabaseUrl) {
  throw new Error('Integration tests require DATABASE_URL to equal TEST_DATABASE_URL.')
}

const parsed = new URL(testDatabaseUrl)
const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
if (parsed.protocol !== 'mysql:' || databaseName !== 'wysm_test' || !allowedHosts.has(parsed.hostname)) {
  throw new Error('Integration tests may only use the local MySQL database named wysm_test.')
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Integration tests require NODE_ENV=test.')
}
