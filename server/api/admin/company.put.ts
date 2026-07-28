import { requireAdminSession } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { parseRequestBody } from '../../utils/validation'
import { companySchema } from '../../validators/content'
import { assertSameOrigin, sanitizeRichText } from '../../utils/security'
import { writeAudit } from '../../utils/audit'
import { invalidateCache } from '../../utils/cache'
import { withApiErrorBoundary } from '../../utils/api-error'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const data = await parseRequestBody(event, companySchema)
  const content = { ...data, fullDescription: sanitizeRichText(data.fullDescription), businessScope: sanitizeRichText(data.businessScope) }
  const result = await withApiErrorBoundary(event, () => prisma.$transaction(async (transaction) => {
    const profile = await transaction.companyProfile.upsert({ where: { id: 1 }, create: { id: 1, ...content } as never, update: content as never })
    await writeAudit(event, { adminUserId: actor.id, module: 'company', action: 'UPDATE', targetType: 'CompanyProfile', targetId: 1, summary: '更新公司信息' }, transaction)
    return profile
  }))
  invalidateCache('site', 'company', 'home')
  return success(result, '保存成功')
})
