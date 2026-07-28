import { getRouterParam } from 'h3'
import { prisma } from '../../../utils/db'
import { notFound, success } from '../../../utils/response'
import { articleSelect, publicRichText } from '../_shared'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return notFound(event, '文章不存在')
  const article = await prisma.article.findFirst({ where: { slug, status: 'PUBLISHED' }, select: articleSelect })
  if (!article) return notFound(event, '文章不存在')
  return success(publicRichText(article))
})
