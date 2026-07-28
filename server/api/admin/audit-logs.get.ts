import { z } from 'zod'
import { requireRole } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { parseRequestQuery } from '../../utils/validation'
import { paginationQuerySchema } from '../../utils/pagination'

const auditQuerySchema = paginationQuerySchema.extend({
  action: z.enum([
    'LOGIN',
    'LOGOUT',
    'CREATE',
    'UPDATE',
    'DELETE',
    'PUBLISH',
    'DISABLE',
    'UPLOAD',
    'DELETE_FILE',
    'UPDATE_ADMIN'
  ]).optional()
})

export default defineEventHandler(async (event) => {
  await requireRole(event, ['SUPER_ADMIN'])
  const query = parseRequestQuery(event, auditQuerySchema)
  const where = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.keyword ? { OR: [{ module: { contains: query.keyword } }, { summary: { contains: query.keyword } }] } : {})
  }
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: query.sortOrder }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { adminUser: { select: { id: true, username: true, displayName: true } } } }),
    prisma.auditLog.count({ where })
  ])
  return success({ items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) })
})
