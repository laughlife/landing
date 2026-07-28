import { requireRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { parseRequestQuery } from '../../utils/validation'
import { paginationQuerySchema } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN'])
  const query = parseRequestQuery(event, paginationQuerySchema)
  const where = query.keyword ? { OR: [{ module: { contains: query.keyword } }, { summary: { contains: query.keyword } }] } : {}
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: query.sortOrder }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { adminUser: { select: { id: true, username: true, displayName: true } } } }),
    prisma.auditLog.count({ where })
  ])
  return success({ items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) })
})
