import { success } from '../../utils/response'
import { requireAdminSession } from '../../utils/auth'
import { assertSameOrigin } from '../../utils/security'
import { writeAudit } from '../../utils/audit'
import { withApiErrorBoundary } from '../../utils/api-error'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const user = await requireAdminSession(event)
  return withApiErrorBoundary(event, async () => {
    await clearUserSession(event)
    try {
      await writeAudit(event, { adminUserId: user.id, module: 'auth', action: 'LOGOUT', targetType: 'adminUser', targetId: user.id, summary: '管理员退出登录' })
    } catch (error) {
      console.error('[logout-audit-error] 会话已清除，但退出审计写入失败', error)
    }
    return success(null, '已退出登录')
  })
})
