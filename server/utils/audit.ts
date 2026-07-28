import type { H3Event } from 'h3'
import { prisma } from './db'
import type { PrismaTransactionClient } from './db'
import { requestContext } from './security'

type AuditInput = { adminUserId?: number | null, module: string, action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'DISABLE' | 'UPLOAD' | 'DELETE_FILE' | 'UPDATE_ADMIN', targetType?: string, targetId?: string | number, summary: string }
type AuditClient = Pick<PrismaTransactionClient, 'auditLog'>

export async function writeAudit(event: H3Event, input: AuditInput, client: AuditClient = prisma): Promise<void> {
  const context = requestContext(event)
  await client.auditLog.create({ data: { ...input, targetId: input.targetId?.toString(), ...context } })
}
