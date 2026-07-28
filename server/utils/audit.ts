import type { H3Event } from 'h3'
import { prisma } from './db'
import { requestContext } from './security'

type AuditInput = { adminUserId?: number | null, module: string, action: 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'DISABLE' | 'UPLOAD' | 'DELETE_FILE' | 'UPDATE_ADMIN', targetType?: string, targetId?: string | number, summary: string }

export async function writeAudit(event: H3Event, input: AuditInput): Promise<void> {
  const context = requestContext(event)
  await prisma.auditLog.create({ data: { ...input, targetId: input.targetId?.toString(), ...context } })
}
