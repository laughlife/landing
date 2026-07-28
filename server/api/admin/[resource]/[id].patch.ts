import { requireAdminSession } from '../../../utils/auth'
import { success, fail } from '../../../utils/response'
import { parseRequestBody } from '../../../utils/validation'
import { assertSameOrigin } from '../../../utils/security'
import { getAdminResource, resourceId, updateResource } from '../../../services/admin-resource'
import { articleSchema, bannerSchema, categorySchema, messageSchema, partnerSchema, productSchema, serviceSchema, userSchema } from '../../../validators/content'

const schemas = { products: productSchema, categories: categorySchema, partners: partnerSchema, services: serviceSchema, banners: bannerSchema, articles: articleSchema, messages: messageSchema, users: userSchema } as const

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const resource = getAdminResource(event)
  if (resource === 'media') return fail(event, 405, 'METHOD_NOT_ALLOWED', '媒体文件仅支持上传或删除')
  const schema = schemas[resource]
  if (!schema) return fail(event, 405, 'METHOD_NOT_ALLOWED', '此资源不支持修改')
  return success(await updateResource(event, resource, resourceId(event), await parseRequestBody<Record<string, unknown>>(event, schema as never), actor), '保存成功')
})
