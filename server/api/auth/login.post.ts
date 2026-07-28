import { z } from 'zod'
import { prisma } from '../../utils/db'
import { fail, success } from '../../utils/response'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, requestContext } from '../../utils/security'
import { readValidatedBody } from '../../utils/validation'
import { writeAudit } from '../../utils/audit'

const loginSchema = z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) })

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const input = await readValidatedBody(event, loginSchema)
  const context = requestContext(event)
  const usernameKey = input.username.toLowerCase()
  enforceRateLimit(event, `login:ip:${context.ipAddress ?? 'unknown'}`, 10, 15 * 60 * 1000)
  enforceRateLimit(event, `login:user:${usernameKey}`, 8, 15 * 60 * 1000)
  const user = await prisma.adminUser.findUnique({ where: { username: input.username }, select: { id: true, username: true, passwordHash: true, displayName: true, role: true, status: true } })
  if (!user || user.status !== 'ENABLED' || !(await verifyPassword(user.passwordHash, input.password))) {
    fail(event, 401, 'INVALID_CREDENTIALS', '用户名或密码错误')
  }
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastLoginIp: context.ipAddress } })
  await setUserSession(event, { user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } })
  await writeAudit(event, { adminUserId: user.id, module: 'auth', action: 'LOGIN', targetType: 'adminUser', targetId: user.id, summary: '管理员登录' })
  return success({ user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role } }, '登录成功')
})
