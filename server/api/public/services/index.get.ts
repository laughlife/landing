import { prisma } from '../../../utils/db'
import { success } from '../../../utils/response'
import { cacheKey } from '../../../utils/cache'
import { publicRichText, serviceSelect } from '../_shared'

export default defineCachedEventHandler(async () => {
  const services = await prisma.serviceItem.findMany({ where: { status: 'ENABLED' }, select: serviceSelect, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  return success(services.map(publicRichText))
}, { maxAge: 60, getKey: () => cacheKey('services') })
