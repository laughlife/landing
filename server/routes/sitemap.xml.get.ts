import { setHeader } from 'h3'
import { prisma } from '../utils/db'

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => {
    if (character === '<') return '&lt;'
    if (character === '>') return '&gt;'
    if (character === '&') return '&amp;'
    if (character === '\'') return '&apos;'
    return '&quot;'
  })
}

export default defineCachedEventHandler(async (event) => {
  const origin = process.env.NUXT_PUBLIC_SITE_URL || `${event.node.req.headers['x-forwarded-proto'] ?? 'http'}://${event.node.req.headers.host ?? 'localhost:3000'}`
  const [products, services, articles] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.serviceItem.findMany({ where: { status: 'ENABLED' }, select: { slug: true, updatedAt: true } }),
    prisma.article.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } })
  ])
  const pages = [
    ...['/', '/products', '/about', '/services', '/partners', '/news', '/contact'].map(path => ({ path, updatedAt: new Date() })),
    ...products.map(item => ({ path: `/products/${item.slug}`, updatedAt: item.updatedAt })),
    ...services.map(item => ({ path: `/services/${item.slug}`, updatedAt: item.updatedAt })),
    ...articles.map(item => ({ path: `/news/${item.slug}`, updatedAt: item.updatedAt }))
  ]
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(page => `<url><loc>${escapeXml(new URL(page.path, origin).toString())}</loc><lastmod>${page.updatedAt.toISOString()}</lastmod></url>`).join('')}</urlset>`
}, { maxAge: 300, swr: true, name: 'portal-sitemap' })
