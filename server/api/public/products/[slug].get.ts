import { getCookie, getRouterParam, setCookie } from 'h3'
import { prisma } from '../../../utils/db'
import { notFound, success } from '../../../utils/response'
import { productSelect, publicRichText } from '../_shared'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return notFound(event, '产品不存在')
  const product = await prisma.product.findFirst({ where: { slug, status: 'PUBLISHED' }, select: productSelect })
  if (!product) return notFound(event, '产品不存在')

  const viewCookie = `portal_product_view_${product.id}`
  if (!getCookie(event, viewCookie)) {
    try {
      await prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
      setCookie(event, viewCookie, '1', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 })
    } catch (error) {
      console.error('[product-view-error] 产品浏览量更新失败', error)
    }
  }
  const relatedProducts = await prisma.product.findMany({
    where: { categoryId: product.category.id, status: 'PUBLISHED', id: { not: product.id } },
    select: productSelect, orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { publishedAt: 'desc' }], take: 4
  })
  return success({ ...publicRichText(product), relatedProducts: relatedProducts.map(publicRichText) })
})
