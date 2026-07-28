import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { cacheKey } from '../../utils/cache'
import { articleSelect, partnerSelect, productSelect, publicCategories, publicPartner, publicRichText, serviceSelect } from './_shared'

export default defineCachedEventHandler(async () => {
  const now = new Date()
  const [site, company, banners, services, categories, products, partners, articles] = await Promise.all([
    prisma.siteSetting.findUnique({ where: { id: 1 }, select: { siteName: true, siteUrl: true, siteTitle: true, siteKeywords: true, siteDescription: true, logo: true, favicon: true, footerText: true, copyright: true, icpNumber: true, contactConfig: true } }),
    prisma.companyProfile.findUnique({ where: { id: 1 }, select: { companyName: true, shortName: true, slogan: true, logo: true, favicon: true, heroTitle: true, heroSubtitle: true, introduction: true, fullDescription: true, businessScope: true, advantages: true, address: true, phone: true, email: true, wechat: true, whatsapp: true, workingHours: true, latitude: true, longitude: true, registrationInfo: true } }),
    prisma.banner.findMany({ where: { status: 'ENABLED', position: 'HOME_HERO', AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gte: now } }] }] }, select: { id: true, title: true, subtitle: true, image: true, mobileImage: true, buttonText: true, buttonLink: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }),
    prisma.serviceItem.findMany({ where: { status: 'ENABLED' }, select: serviceSelect, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }], take: 4 }),
    prisma.productCategory.findMany({ where: { status: 'ENABLED', parentId: null }, select: { id: true, name: true, slug: true, summary: true, description: true, coverImage: true, icon: true, children: { where: { status: 'ENABLED' }, select: { id: true, name: true, slug: true, summary: true, description: true, coverImage: true, icon: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: productSelect, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }], take: 6 }),
    prisma.partner.findMany({ where: { status: 'ENABLED' }, select: partnerSelect, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }], take: 6 }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, select: articleSelect, orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }, { sortOrder: 'asc' }], take: 3 })
  ])
  return success({
    site,
    company: company ? publicRichText(company) : null,
    banners,
    services: services.map(publicRichText),
    categories: publicCategories(categories),
    products: products.map(publicRichText),
    partners: partners.map(publicPartner),
    articles: articles.map(publicRichText),
    featuredProducts: products.map(publicRichText),
    featuredPartners: partners.map(publicPartner),
    latestArticles: articles.map(publicRichText)
  })
}, { maxAge: 30, getKey: () => cacheKey('home') })
