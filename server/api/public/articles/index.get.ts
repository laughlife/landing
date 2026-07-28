import { getRequestURL } from 'h3'
import { prisma } from '../../../utils/db'
import { success } from '../../../utils/response'
import { parseRequestQuery } from '../../../utils/validation'
import { pageMeta, paginationQuerySchema } from '../../../utils/pagination'
import { cacheKey } from '../../../utils/cache'
import { articleSelect, publicRichText } from '../_shared'

export default defineCachedEventHandler(async (event) => {
  const query = parseRequestQuery(event, paginationQuerySchema)
  const where = { status: 'PUBLISHED' as const, ...(query.keyword ? { OR: [{ title: { contains: query.keyword } }, { summary: { contains: query.keyword } }, { author: { contains: query.keyword } }] } : {}) }
  const [items, total] = await Promise.all([
    prisma.article.findMany({ where, select: articleSelect, orderBy: [{ publishedAt: 'desc' }, { sortOrder: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    prisma.article.count({ where })
  ])
  return success({ items: items.map(publicRichText), pagination: pageMeta(query.page, query.pageSize, total) })
}, { maxAge: 60, getKey: event => cacheKey('articles', getRequestURL(event).search) })
