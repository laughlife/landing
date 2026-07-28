import { getRouterParam } from 'h3'
import { prisma } from '../../../utils/db'
import { notFound, success } from '../../../utils/response'
import { publicRichText, serviceSelect } from '../_shared'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return notFound(event, '服务不存在')
  const service = await prisma.serviceItem.findFirst({ where: { slug, status: 'ENABLED' }, select: serviceSelect })
  if (!service) return notFound(event, '服务不存在')
  return success(publicRichText(service))
})
