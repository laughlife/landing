import { getRequestURL } from 'h3'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { getValidatedQuery } from '../../utils/validation'
import { pageMeta, paginationQuerySchema } from '../../utils/pagination'
import { cacheKey } from '../../utils/cache'
import { partnerSelect, publicPartner } from './_shared'

export default defineCachedEventHandler(async (event) => {
  const query = getValidatedQuery(event, paginationQuerySchema)
  const where = { status: 'ENABLED' as const, ...(query.keyword ? { OR: [{ name: { contains: query.keyword } }, { summary: { contains: query.keyword } }, { cooperationType: { contains: query.keyword } }] } : {}) }
  const [items, total] = await Promise.all([
    prisma.partner.findMany({ where, select: partnerSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.partner.count({ where })
  ])
  return success({ items: items.map(publicPartner), pagination: pageMeta(query.page, query.pageSize, total) })
}, { maxAge: 60, getKey: event => cacheKey('partners', getRequestURL(event).search) })
