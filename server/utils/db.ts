import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client'

const DEFAULT_CONNECTION_LIMIT = 5

type PrismaGlobal = typeof globalThis & {
  __portalPrisma?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to initialize the database client.')
  }

  let url: URL

  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL must be a valid MySQL connection URL.')
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''))
  const port = url.port ? Number.parseInt(url.port, 10) : 3306

  if (
    url.protocol !== 'mysql:'
    || !url.hostname
    || !url.username
    || !database
    || !Number.isInteger(port)
    || port < 1
    || port > 65535
  ) {
    throw new Error('DATABASE_URL must contain valid MySQL connection details.')
  }

  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: DEFAULT_CONNECTION_LIMIT
  })

  return new PrismaClient({ adapter })
}

const prismaGlobal = globalThis as PrismaGlobal

export const prisma = prismaGlobal.__portalPrisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.__portalPrisma = prisma
}
