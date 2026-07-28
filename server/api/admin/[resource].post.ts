import { requireAdminSession } from '../../utils/auth'
import { success, fail } from '../../utils/response'
import { parseRequestBody } from '../../utils/validation'
import { assertSameOrigin } from '../../utils/security'
import { getAdminResource, createResource } from '../../services/admin-resource'
import { articleSchema, bannerSchema, categorySchema, messageSchema, partnerSchema, productSchema, serviceSchema, userSchema } from '../../validators/content'

const schemas = { products: productSchema, categories: categorySchema, partners: partnerSchema, services: serviceSchema, banners: bannerSchema, articles: articleSchema, messages: messageSchema, users: userSchema } as const

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const resource = getAdminResource(event)
  if (resource === 'media' || resource === 'messages') return fail(event, 405, 'METHOD_NOT_ALLOWED', '此资源不支持新建')
  const schema = schemas[resource]
  if (!schema) return fail(event, 405, 'METHOD_NOT_ALLOWED', '此资源不支持新建')
  return success(await createResource(event, resource, await parseRequestBody<Record<string, unknown>>(event, schema as never), actor), '创建成功')
})
