import { requireAdminSession } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { parseRequestBody } from '../../utils/validation'
import { companySchema } from '../../validators/content'
import { assertSameOrigin, sanitizeRichText } from '../../utils/security'
import { writeAudit } from '../../utils/audit'
import { invalidateCache } from '../../utils/cache'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const data = await parseRequestBody(event, companySchema)
  const content = { ...data, fullDescription: sanitizeRichText(data.fullDescription), businessScope: sanitizeRichText(data.businessScope) }
  const result = await prisma.companyProfile.upsert({ where: { id: 1 }, create: { id: 1, ...content } as never, update: content as never })
  await writeAudit(event, { adminUserId: actor.id, module: 'company', action: 'UPDATE', targetType: 'CompanyProfile', targetId: 1, summary: '更新公司信息' })
  invalidateCache('site', 'company', 'home')
  return success(result, '保存成功')
})
