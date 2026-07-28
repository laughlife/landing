import { getRequestURL } from 'h3'
import { z } from 'zod'
import { prisma } from '../../../utils/db'
import { success } from '../../../utils/response'
import { getValidatedQuery } from '../../../utils/validation'
import { pageMeta, paginationQuerySchema } from '../../../utils/pagination'
import { cacheKey } from '../../../utils/cache'
import { productSelect } from '../_shared'

const querySchema = paginationQuerySchema.extend({ category: z.string().trim().max(191).optional() })

export default defineCachedEventHandler(async (event) => {
  const query = getValidatedQuery(event, querySchema)
  const where = {
    status: 'PUBLISHED' as const,
    ...(query.category ? { category: { slug: query.category, status: 'ENABLED' as const } } : {}),
    ...(query.keyword ? { OR: [{ name: { contains: query.keyword } }, { model: { contains: query.keyword } }, { summary: { contains: query.keyword } }] } : {})
  }
  const orderBy = query.sortBy === 'name'
    ? [{ name: query.sortOrder }]
    : query.sortBy === 'sortOrder'
      ? [{ sortOrder: query.sortOrder }, { publishedAt: 'desc' as const }]
      : [{ publishedAt: 'desc' as const }, { sortOrder: 'asc' as const }]
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, select: productSelect, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.product.count({ where })
  ])
  return success({ items, pagination: pageMeta(query.page, query.pageSize, total) })
}, { maxAge: 30, getKey: event => cacheKey('products', getRequestURL(event).search) })
