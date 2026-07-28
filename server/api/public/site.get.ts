import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { cacheKey } from '../../utils/cache'

export default defineCachedEventHandler(async () => {
  const site = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { siteName: true, siteUrl: true, siteTitle: true, siteKeywords: true, siteDescription: true, logo: true, favicon: true, footerText: true, copyright: true, icpNumber: true, contactConfig: true }
  })
  return success(site)
}, { maxAge: 60, getKey: () => cacheKey('site') })
