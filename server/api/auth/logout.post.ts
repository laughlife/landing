import { success } from '../../utils/response'
import { requireAdminSession } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/security'
import { writeAudit } from '../../utils/audit'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireAdminSession(event)
  await writeAudit(event, { adminUserId: user.id, module: 'auth', action: 'LOGOUT', targetType: 'adminUser', targetId: user.id, summary: '管理员退出登录' })
  await clearUserSession(event)
  return success(null, '已退出登录')
})
