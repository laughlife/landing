import { requireAdminSession } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const [products, publishedProducts, categories, partners, messages, articles, mediaFiles, recentMessages, recentLogs] = await Promise.all([
    prisma.product.count(), prisma.product.count({ where: { status: 'PUBLISHED' } }), prisma.productCategory.count(), prisma.partner.count(), prisma.contactMessage.count({ where: { status: 'NEW' } }), prisma.article.count(), prisma.mediaFile.count(),
    prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, name: true, subject: true, status: true, createdAt: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, module: true, action: true, summary: true, createdAt: true, adminUser: { select: { displayName: true } } } })
  ])
  return success({ products, publishedProducts, categories, partners, pendingMessages: messages, articles, mediaFiles, recentMessages, recentLogs })
})
