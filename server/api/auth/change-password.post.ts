import { z } from 'zod'
import { prisma } from '../../utils/db'
import { fail, success } from '../../utils/response'
import { requireAdminSession } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/security'
import { readValidatedBody } from '../../utils/validation'
import { writeAudit } from '../../utils/audit'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12, '新密码至少需要 12 位').max(128),
  confirmPassword: z.string().min(1).max(128)
}).refine(value => value.newPassword === value.confirmPassword, { message: '两次输入的新密码不一致', path: ['confirmPassword'] })

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const input = await readValidatedBody(event, changePasswordSchema)
  if (input.currentPassword === input.newPassword) fail(event, 400, 'VALIDATION_ERROR', '新密码不能与当前密码相同')
  const user = await prisma.adminUser.findUnique({ where: { id: actor.id }, select: { passwordHash: true, status: true } })
  if (!user || user.status !== 'ENABLED' || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    fail(event, 400, 'INVALID_CURRENT_PASSWORD', '当前密码错误')
  }
  await prisma.adminUser.update({ where: { id: actor.id }, data: { passwordHash: await hashPassword(input.newPassword) } })
  await writeAudit(event, { adminUserId: actor.id, module: 'auth', action: 'UPDATE_ADMIN', targetType: 'adminUser', targetId: actor.id, summary: '修改当前账号密码' })
  return success(null, '密码修改成功')
})
