import type { H3Event } from 'h3'
import { prisma } from './db'
import { fail } from './response'

export type PortalRole = 'SUPER_ADMIN' | 'EDITOR'
export type AdminSession = { id: number, username: string, displayName: string, role: PortalRole }

export async function requireAdminSession(event: H3Event): Promise<AdminSession> {
  const session = await getUserSession(event)
  const user = session.user
  if (!user?.id || !user.role) return fail(event, 401, 'UNAUTHORIZED', '请先登录')
  const persisted = await prisma.adminUser.findUnique({ where: { id: user.id }, select: { id: true, username: true, displayName: true, role: true, status: true } })
  if (!persisted || persisted.status !== 'ENABLED') return fail(event, 401, 'UNAUTHORIZED', '登录状态已失效')
  return persisted
}

export async function requireRole(event: H3Event, roles: readonly PortalRole[]): Promise<AdminSession> {
  const session = await requireAdminSession(event)
  if (!roles.includes(session.role)) return fail(event, 403, 'FORBIDDEN', '没有执行此操作的权限')
  return session
}
