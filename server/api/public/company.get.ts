import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { cacheKey } from '../../utils/cache'
import { publicRichText } from './_shared'

export default defineCachedEventHandler(async () => {
  const company = await prisma.companyProfile.findUnique({
    where: { id: 1 },
    select: { companyName: true, shortName: true, slogan: true, logo: true, favicon: true, heroTitle: true, heroSubtitle: true, introduction: true, fullDescription: true, businessScope: true, advantages: true, address: true, phone: true, email: true, wechat: true, whatsapp: true, workingHours: true, latitude: true, longitude: true, registrationInfo: true }
  })
  return success(company ? publicRichText(company) : null)
}, { maxAge: 60, getKey: () => cacheKey('company') })
