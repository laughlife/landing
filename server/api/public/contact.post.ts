import { prisma } from '../../utils/db'
import { fail, success } from '../../utils/response'
import { enforceRateLimit } from '../../utils/rate-limit'
import { assertSameOrigin, requestContext } from '../../utils/security'
import { parseRequestBody } from '../../utils/validation'
import { contactMessageSchema } from '../../validators/contact'
import { withApiErrorBoundary } from '../../utils/api-error'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const input = await parseRequestBody(event, contactMessageSchema)
  const context = requestContext(event)
  enforceRateLimit(event, `contact:ip:${context.ipAddress ?? 'unknown'}`, 5, 60 * 60 * 1000)
  if (input.website) return success({ accepted: true }, '提交成功')
  if (/https?:\/\/|\b(?:viagra|casino|loan)\b/i.test(input.message)) fail(event, 400, 'SPAM_REJECTED', '提交内容未通过安全检查')
  return withApiErrorBoundary(event, async () => {
    if (input.productId) {
      const product = await prisma.product.findFirst({ where: { id: input.productId, status: 'PUBLISHED' }, select: { id: true } })
      if (!product) fail(event, 400, 'VALIDATION_ERROR', '关联产品不存在')
    }
    const { website: _website, ...messageInput } = input
    const message = await prisma.contactMessage.create({ data: { ...messageInput, ipAddress: context.ipAddress, userAgent: context.userAgent } })
    return success({ id: message.id }, '提交成功')
  })
})
