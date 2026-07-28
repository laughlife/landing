import { prisma } from '../../utils/db'
import { success } from '../../utils/response'
import { cacheKey } from '../../utils/cache'
import { publicCategories } from './_shared'

export default defineCachedEventHandler(async () => {
  const categories = await prisma.productCategory.findMany({
    where: { status: 'ENABLED', parentId: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, slug: true, summary: true, description: true, coverImage: true, icon: true, seoTitle: true, seoKeywords: true, seoDescription: true,
      children: { where: { status: 'ENABLED' }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, summary: true, description: true, coverImage: true, icon: true, seoTitle: true, seoKeywords: true, seoDescription: true } }
    }
  })
  return success(publicCategories(categories))
}, { maxAge: 60, getKey: () => cacheKey('categories') })
