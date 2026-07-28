import { requireAdminSession } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { parseRequestBody } from '../../utils/validation'
import { siteSettingSchema } from '../../validators/content'
import { assertSameOrigin } from '../../utils/security'
import { writeAudit } from '../../utils/audit'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const data = await parseRequestBody(event, siteSettingSchema)
  const result = await prisma.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data } as never, update: data as never })
  await writeAudit(event, { adminUserId: actor.id, module: 'site-settings', action: 'UPDATE', targetType: 'SiteSetting', targetId: 1, summary: '更新网站设置' })
  invalidateCache('site', 'home')
  return success(result, '保存成功')
})
