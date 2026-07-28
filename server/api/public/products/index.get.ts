import { getRequestURL } from 'h3'
import { z } from 'zod'
import { prisma } from '../../../utils/db'
import { success } from '../../../utils/response'
import { parseRequestQuery } from '../../../utils/validation'
import { pageMeta, paginationQuerySchema } from '../../../utils/pagination'
import { cacheKey } from '../../../utils/cache'
import { productCardSelect } from '../_shared'

const querySchema = paginationQuerySchema.extend({ category: z.string().trim().max(191).optional() })

export default defineCachedEventHandler(async (event) => {
  const query = parseRequestQuery(event, querySchema)
  const selectedCategory = query.category
    ? await prisma.productCategory.findFirst({
        where: { slug: query.category, status: 'ENABLED' },
        select: { id: true, children: { where: { status: 'ENABLED' }, select: { id: true } } }
      })
    : null
  const categoryIds = selectedCategory ? [selectedCategory.id, ...selectedCategory.children.map(item => item.id)] : []
  const where = {
    status: 'PUBLISHED' as const,
    ...(query.category ? { categoryId: { in: categoryIds } } : {}),
    ...(query.keyword ? { OR: [{ name: { contains: query.keyword } }, { model: { contains: query.keyword } }, { summary: { contains: query.keyword } }] } : {})
  }
  const orderBy = query.sortBy === 'name'
    ? [{ name: query.sortOrder }]
    : query.sortBy === 'sortOrder'
      ? [{ sortOrder: query.sortOrder }, { publishedAt: 'desc' as const }]
      : [{ publishedAt: 'desc' as const }, { sortOrder: 'asc' as const }]
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, select: productCardSelect, orderBy, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.product.count({ where })
  ])
  return success({ items, pagination: pageMeta(query.page, query.pageSize, total) })
}, { maxAge: 30, getKey: event => cacheKey('products', getRequestURL(event).search) })
