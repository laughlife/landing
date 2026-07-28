import type { PrismaTransactionClient } from '../utils/db'

export type MediaUsage = {
  key: string
  resourceType: string
  resourceId: number
  resourceLabel: string
  field: string
  fieldLabel: string
  locationLabel: string
  editUrl: string
}

type MediaReferenceClient = Pick<
  PrismaTransactionClient,
  'productImage' | 'companyProfile' | 'siteSetting' | 'productCategory' | 'product' | 'partner' | 'serviceItem' | 'banner' | 'article' | 'adminUser'
>

function includesImageSource(value: string | null, url: string) {
  if (!value?.includes(url)) return false
  for (const match of value.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2] === url) return true
  }
  return false
}

export async function findMediaUsages(client: MediaReferenceClient, mediaId: number, url: string): Promise<MediaUsage[]> {
  const [
    productImages,
    companies,
    settings,
    categories,
    products,
    partners,
    services,
    banners,
    articles,
    users
  ] = await Promise.all([
    client.productImage.findMany({
      where: { OR: [{ mediaId }, { imageUrl: url }] },
      select: { id: true, product: { select: { id: true, name: true } } }
    }),
    client.companyProfile.findMany({
      where: { OR: [{ logo: url }, { favicon: url }, { fullDescription: { contains: url } }, { businessScope: { contains: url } }] },
      select: { id: true, companyName: true, logo: true, favicon: true, fullDescription: true, businessScope: true }
    }),
    client.siteSetting.findMany({
      where: { OR: [{ logo: url }, { favicon: url }, { fallbackImage: url }] },
      select: { id: true, siteName: true, logo: true, favicon: true, fallbackImage: true }
    }),
    client.productCategory.findMany({
      where: { OR: [{ coverImage: url }, { description: { contains: url } }] },
      select: { id: true, name: true, coverImage: true, description: true }
    }),
    client.product.findMany({
      where: { OR: [{ coverImage: url }, { description: { contains: url } }] },
      select: { id: true, name: true, coverImage: true, description: true }
    }),
    client.partner.findMany({
      where: { OR: [{ logo: url }, { coverImage: url }, { description: { contains: url } }] },
      select: { id: true, name: true, logo: true, coverImage: true, description: true }
    }),
    client.serviceItem.findMany({
      where: { OR: [{ coverImage: url }, { description: { contains: url } }] },
      select: { id: true, name: true, coverImage: true, description: true }
    }),
    client.banner.findMany({
      where: { OR: [{ image: url }, { mobileImage: url }] },
      select: { id: true, title: true, image: true, mobileImage: true }
    }),
    client.article.findMany({
      where: { OR: [{ coverImage: url }, { content: { contains: url } }] },
      select: { id: true, title: true, coverImage: true, content: true }
    }),
    client.adminUser.findMany({
      where: { avatar: url },
      select: { id: true, displayName: true }
    })
  ])

  const usages = new Map<string, MediaUsage>()
  const add = (usage: Omit<MediaUsage, 'key'>) => {
    const key = `${usage.resourceType}:${usage.resourceId}:${usage.field}`
    if (!usages.has(key)) usages.set(key, { key, ...usage })
  }

  for (const item of productImages) {
    add({
      resourceType: 'products',
      resourceId: item.product.id,
      resourceLabel: item.product.name,
      field: 'images',
      fieldLabel: '详情图片',
      locationLabel: '产品管理',
      editUrl: `/admin/products/${item.product.id}`
    })
  }
  for (const item of companies) {
    const base = { resourceType: 'company', resourceId: item.id, resourceLabel: item.companyName, locationLabel: '公司资料', editUrl: '/admin/company' }
    if (item.logo === url) add({ ...base, field: 'logo', fieldLabel: '公司 Logo' })
    if (item.favicon === url) add({ ...base, field: 'favicon', fieldLabel: '公司 Favicon' })
    if (includesImageSource(item.fullDescription, url)) add({ ...base, field: 'fullDescription', fieldLabel: '企业介绍正文' })
    if (includesImageSource(item.businessScope, url)) add({ ...base, field: 'businessScope', fieldLabel: '业务范围正文' })
  }
  for (const item of settings) {
    const base = { resourceType: 'settings', resourceId: item.id, resourceLabel: item.siteName, locationLabel: '网站设置', editUrl: '/admin/settings' }
    if (item.logo === url) add({ ...base, field: 'logo', fieldLabel: '网站 Logo' })
    if (item.favicon === url) add({ ...base, field: 'favicon', fieldLabel: '网站 Favicon' })
    if (item.fallbackImage === url) add({ ...base, field: 'fallbackImage', fieldLabel: '缺图默认图片' })
  }
  for (const item of categories) {
    const base = { resourceType: 'categories', resourceId: item.id, resourceLabel: item.name, locationLabel: '产品分类', editUrl: `/admin/categories?edit=${item.id}` }
    if (item.coverImage === url) add({ ...base, field: 'coverImage', fieldLabel: '分类封面' })
    if (includesImageSource(item.description, url)) add({ ...base, field: 'description', fieldLabel: '分类介绍正文' })
  }
  for (const item of products) {
    const base = { resourceType: 'products', resourceId: item.id, resourceLabel: item.name, locationLabel: '产品管理', editUrl: `/admin/products/${item.id}` }
    if (item.coverImage === url) add({ ...base, field: 'coverImage', fieldLabel: '产品封面' })
    if (includesImageSource(item.description, url)) add({ ...base, field: 'description', fieldLabel: '产品介绍正文' })
  }
  for (const item of partners) {
    const base = { resourceType: 'partners', resourceId: item.id, resourceLabel: item.name, locationLabel: '合作伙伴', editUrl: `/admin/partners?edit=${item.id}` }
    if (item.logo === url) add({ ...base, field: 'logo', fieldLabel: '伙伴 Logo' })
    if (item.coverImage === url) add({ ...base, field: 'coverImage', fieldLabel: '伙伴封面' })
    if (includesImageSource(item.description, url)) add({ ...base, field: 'description', fieldLabel: '伙伴介绍正文' })
  }
  for (const item of services) {
    const base = { resourceType: 'services', resourceId: item.id, resourceLabel: item.name, locationLabel: '服务项目', editUrl: `/admin/services?edit=${item.id}` }
    if (item.coverImage === url) add({ ...base, field: 'coverImage', fieldLabel: '服务封面' })
    if (includesImageSource(item.description, url)) add({ ...base, field: 'description', fieldLabel: '服务介绍正文' })
  }
  for (const item of banners) {
    const base = { resourceType: 'banners', resourceId: item.id, resourceLabel: item.title, locationLabel: '轮播图', editUrl: `/admin/banners?edit=${item.id}` }
    if (item.image === url) add({ ...base, field: 'image', fieldLabel: '桌面端图片' })
    if (item.mobileImage === url) add({ ...base, field: 'mobileImage', fieldLabel: '移动端图片' })
  }
  for (const item of articles) {
    const base = { resourceType: 'articles', resourceId: item.id, resourceLabel: item.title, locationLabel: '新闻资讯', editUrl: `/admin/articles/${item.id}` }
    if (item.coverImage === url) add({ ...base, field: 'coverImage', fieldLabel: '文章封面' })
    if (includesImageSource(item.content, url)) add({ ...base, field: 'content', fieldLabel: '文章正文' })
  }
  for (const item of users) {
    add({
      resourceType: 'users',
      resourceId: item.id,
      resourceLabel: item.displayName,
      field: 'avatar',
      fieldLabel: '管理员头像',
      locationLabel: '管理员管理',
      editUrl: `/admin/users?edit=${item.id}`
    })
  }

  return [...usages.values()].sort((left, right) =>
    left.locationLabel.localeCompare(right.locationLabel, 'zh-CN')
    || left.resourceLabel.localeCompare(right.resourceLabel, 'zh-CN')
    || left.fieldLabel.localeCompare(right.fieldLabel, 'zh-CN')
  )
}
