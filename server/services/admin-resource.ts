import { createError, getRouterParam, type H3Event } from 'h3'
import { readdir, rm } from 'node:fs/promises'
import { dirname, extname, join, parse, resolve } from 'node:path'
import { prisma, type PrismaTransactionClient } from '../utils/db'
import { notFound, fail } from '../utils/response'
import { isPathWithinRoot, isSafeRelativeUploadPath, sanitizeRichText } from '../utils/security'
import { invalidateCache } from '../utils/cache'
import { writeAudit } from '../utils/audit'
import type { AdminSession } from '../utils/auth'

export type AdminResource = 'products' | 'categories' | 'partners' | 'services' | 'banners' | 'articles' | 'messages' | 'media' | 'users'
type Delegate = { findMany: (input?: never) => Promise<unknown[]>, findUnique: (input: never) => Promise<unknown>, count: (input?: never) => Promise<number>, create: (input: never) => Promise<unknown>, update: (input: never) => Promise<unknown>, delete: (input: never) => Promise<unknown> }
type ProductImageInput = { mediaId: number, altText?: string | null }
type ValidatedProductImage = { mediaId: number, imageUrl: string, altText: string | null }
type ResourceDatabaseClient = Pick<PrismaTransactionClient, 'product' | 'productCategory' | 'partner' | 'serviceItem' | 'banner' | 'article' | 'contactMessage' | 'mediaFile' | 'adminUser'>

function resourceDelegates(client: ResourceDatabaseClient): Record<AdminResource, Delegate> {
  return {
    products: client.product as unknown as Delegate,
    categories: client.productCategory as unknown as Delegate,
    partners: client.partner as unknown as Delegate,
    services: client.serviceItem as unknown as Delegate,
    banners: client.banner as unknown as Delegate,
    articles: client.article as unknown as Delegate,
    messages: client.contactMessage as unknown as Delegate,
    media: client.mediaFile as unknown as Delegate,
    users: client.adminUser as unknown as Delegate
  }
}

const delegates = resourceDelegates(prisma)

const safeAdminUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  avatar: true,
  role: true,
  status: true,
  lastLoginAt: true,
  lastLoginIp: true,
  createdAt: true,
  updatedAt: true
} as const

const resourceMeta: Record<AdminResource, { model: string, search: string[], sort: string[], cache: string[] }> = {
  products: { model: '产品', search: ['name', 'model', 'summary'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'name', 'publishedAt', 'viewCount'], cache: ['products', 'home'] },
  categories: { model: '产品分类', search: ['name', 'slug'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'name'], cache: ['categories', 'products', 'home'] },
  partners: { model: '合作伙伴', search: ['name', 'summary'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'name'], cache: ['partners', 'home'] },
  services: { model: '服务项目', search: ['name', 'summary'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'name'], cache: ['services', 'home'] },
  banners: { model: '轮播图', search: ['title', 'subtitle'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'startAt'], cache: ['home'] },
  articles: { model: '文章', search: ['title', 'summary', 'author'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'publishedAt', 'title'], cache: ['articles', 'home'] },
  messages: { model: '咨询留言', search: ['name', 'company', 'phone', 'email', 'subject', 'message'], sort: ['createdAt', 'updatedAt', 'status'], cache: [] },
  media: { model: '媒体文件', search: ['originalName', 'mimeType', 'checksum'], sort: ['createdAt', 'size', 'originalName'], cache: ['media'] },
  users: { model: '管理员', search: ['username', 'displayName', 'email'], sort: ['createdAt', 'updatedAt', 'lastLoginAt', 'username'], cache: [] }
}

export function getAdminResource(event: H3Event): AdminResource {
  const resource = getRouterParam(event, 'resource')
  if (!resource || !(resource in delegates)) fail(event, 404, 'NOT_FOUND', '后台资源不存在')
  return resource as AdminResource
}

export function resourceId(event: H3Event): number {
  const value = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(value) || value < 1) fail(event, 400, 'VALIDATION_ERROR', '资源编号无效')
  return value
}

function cleanPayload(input: Record<string, unknown>): Record<string, unknown> {
  const data = { ...input }
  for (const key of ['description', 'content', 'fullDescription', 'businessScope']) {
    if (typeof data[key] === 'string') data[key] = sanitizeRichText(data[key])
  }
  delete data.images
  delete data.password
  return data
}

export async function listResource(resource: AdminResource, query: { page: number, pageSize: number, keyword?: string, status?: string, categoryId?: number, category?: string, isFeatured?: boolean, sortBy?: string, sortOrder: 'asc' | 'desc' }) {
  const meta = resourceMeta[resource]
  const delegate = delegates[resource]
  const defaultSort = meta.sort.includes('updatedAt') ? 'updatedAt' : meta.sort[0]!
  const sortBy = meta.sort.includes(query.sortBy ?? '') ? query.sortBy! : defaultSort
  const where: Record<string, unknown> = {}
  if (resource !== 'media' && query.status) where.status = query.status
  if (resource === 'products' && query.categoryId) where.categoryId = query.categoryId
  if (resource === 'products' && query.isFeatured !== undefined) where.isFeatured = query.isFeatured
  if (resource === 'media' && query.category) where.category = query.category
  if (query.keyword) where.OR = meta.search.map(field => ({ [field]: { contains: query.keyword } }))
  const options = { where, orderBy: { [sortBy]: query.sortOrder }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }
  const itemsPromise = resource === 'products'
    ? prisma.product.findMany({ ...options, include: { category: { select: { id: true, name: true, slug: true } }, images: { orderBy: { sortOrder: 'asc' }, include: { media: { select: { id: true, url: true, mimeType: true } } } } } })
    : resource === 'categories'
      ? prisma.productCategory.findMany({ ...options, include: { parent: { select: { id: true, name: true, slug: true } }, children: { select: { id: true, name: true, slug: true, sortOrder: true, status: true }, orderBy: { sortOrder: 'asc' } }, _count: { select: { products: true } } } })
      : resource === 'users'
        ? prisma.adminUser.findMany({ ...options, select: safeAdminUserSelect })
        : resource === 'messages'
          ? prisma.contactMessage.findMany({ ...options, include: { product: { select: { id: true, name: true } } } })
          : delegate.findMany(options as never)
  const [items, total] = await Promise.all([itemsPromise, delegate.count({ where } as never)])
  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) }
}

export async function getResource(event: H3Event, resource: AdminResource, id: number) {
  const item = resource === 'products'
    ? await prisma.product.findUnique({ where: { id }, include: { category: true, images: { orderBy: { sortOrder: 'asc' }, include: { media: true } } } })
    : resource === 'categories'
      ? await prisma.productCategory.findUnique({ where: { id }, include: { parent: true, children: { orderBy: { sortOrder: 'asc' } } } })
      : resource === 'users'
        ? await prisma.adminUser.findUnique({ where: { id }, select: safeAdminUserSelect })
        : resource === 'messages'
          ? await prisma.contactMessage.findUnique({ where: { id }, include: { product: { select: { id: true, name: true } } } })
          : await delegates[resource].findUnique({ where: { id } } as never)
  if (!item) return notFound(event, `${resourceMeta[resource].model}不存在`)
  return item
}

async function assertCategoryParent(id: number | null, parentId: unknown): Promise<void> {
  if (parentId === null || parentId === undefined) return
  const parent = await prisma.productCategory.findUnique({ where: { id: Number(parentId) }, select: { id: true, parentId: true } })
  if (!parent) throw createError({ statusCode: 400, statusMessage: '父分类不存在' })
  if (parent.parentId !== null) throw createError({ statusCode: 400, statusMessage: '分类最多支持两级' })
  if (parent.id === id || parent.parentId === id) throw createError({ statusCode: 400, statusMessage: '分类不能形成循环层级' })
}

async function replaceProductImages(client: Pick<PrismaTransactionClient, 'productImage'>, productId: number, images: ValidatedProductImage[]): Promise<void> {
  await client.productImage.deleteMany({ where: { productId } })
  if (images.length) {
    await client.productImage.createMany({
      data: images.map((image, index) => ({
        productId,
        mediaId: image.mediaId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        sortOrder: index
      }))
    })
  }
}

async function validateProductImages(client: Pick<PrismaTransactionClient, 'mediaFile'>, images: unknown[]): Promise<ValidatedProductImage[]> {
  const input = images as ProductImageInput[]
  const mediaIds = input.map(image => Number(image.mediaId))
  if (!mediaIds.length) return []
  if (new Set(mediaIds).size !== mediaIds.length) throw createError({ statusCode: 400, statusMessage: '详情图片不能重复' })
  const media = await client.mediaFile.findMany({
    where: { id: { in: mediaIds }, mimeType: { startsWith: 'image/' } },
    select: { id: true, url: true }
  })
  if (media.length !== mediaIds.length) throw createError({ statusCode: 400, statusMessage: '存在无效图片或非图片媒体' })
  const urls = new Map(media.map(item => [item.id, item.url]))
  return input.map(image => ({
    mediaId: Number(image.mediaId),
    imageUrl: urls.get(Number(image.mediaId))!,
    altText: image.altText?.trim() || null
  }))
}

async function deleteMediaFiles(relativePath: string, storedName: string): Promise<void> {
  const root = resolve(process.env.UPLOAD_DIR || './storage/uploads')
  if (!isSafeRelativeUploadPath(relativePath)) return
  const original = resolve(root, relativePath)
  if (!isPathWithinRoot(root, original)) return
  const directory = dirname(original)
  const baseName = parse(storedName).name
  const names = await readdir(directory).catch(() => [])
  await Promise.allSettled(names.filter(name => name === storedName || (name.startsWith(`${baseName}-`) && extname(name) === '.webp')).map(name => rm(join(directory, name), { force: true })))
}

type MediaReferenceClient = Pick<PrismaTransactionClient, 'productImage' | 'mediaReference' | 'companyProfile' | 'siteSetting' | 'productCategory' | 'product' | 'partner' | 'serviceItem' | 'banner' | 'article' | 'adminUser'>

async function countDirectMediaReferences(client: MediaReferenceClient, url: string, mediaId: number): Promise<number> {
  const counts = await Promise.all([
    client.productImage.count({ where: { OR: [{ mediaId }, { imageUrl: url }] } }),
    client.mediaReference.count({ where: { mediaId } }),
    client.companyProfile.count({ where: { OR: [{ logo: url }, { favicon: url }] } }),
    client.siteSetting.count({ where: { OR: [{ logo: url }, { favicon: url }] } }),
    client.productCategory.count({ where: { coverImage: url } }),
    client.product.count({ where: { coverImage: url } }),
    client.partner.count({ where: { OR: [{ logo: url }, { coverImage: url }] } }),
    client.serviceItem.count({ where: { coverImage: url } }),
    client.banner.count({ where: { OR: [{ image: url }, { mobileImage: url }] } }),
    client.article.count({ where: { coverImage: url } }),
    client.adminUser.count({ where: { avatar: url } })
  ])
  return counts.reduce((total, count) => total + count, 0)
}

export async function createResource(event: H3Event, resource: AdminResource, input: Record<string, unknown>, actor: AdminSession) {
  if (resource === 'users' && actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可管理账号')
  if (resource === 'media') fail(event, 405, 'METHOD_NOT_ALLOWED', '请使用上传接口创建媒体')
  if (resource === 'categories') await assertCategoryParent(-1, input.parentId)
  const raw = { ...input }
  const data = cleanPayload(raw)
  if (resource === 'users') {
    if (typeof raw.password !== 'string' || raw.password.length < 12) fail(event, 400, 'VALIDATION_ERROR', '新管理员密码至少需要 12 位')
    data.passwordHash = await hashPassword(raw.password)
  }
  if (resource === 'products' && data.status === 'PUBLISHED') data.publishedAt = new Date()
  const created = await prisma.$transaction(async (transaction) => {
    const transactionDelegates = resourceDelegates(transaction)
    const images = resource === 'products' && Array.isArray(raw.images)
      ? await validateProductImages(transaction, raw.images)
      : undefined
    const item = await transactionDelegates[resource].create({ data } as never) as { id: number }
    if (resource === 'products' && images) await replaceProductImages(transaction, item.id, images)
    await writeAudit(event, { adminUserId: actor.id, module: resource, action: data.status === 'PUBLISHED' ? 'PUBLISH' : 'CREATE', targetType: resource, targetId: item.id, summary: `新增${resourceMeta[resource].model}` }, transaction)
    return resource === 'users'
      ? await transaction.adminUser.findUnique({ where: { id: item.id }, select: safeAdminUserSelect })
      : item
  })
  invalidateCache(...resourceMeta[resource].cache)
  return created
}

export async function updateResource(event: H3Event, resource: AdminResource, id: number, input: Record<string, unknown>, actor: AdminSession) {
  const existing = await getResource(event, resource, id) as { role?: string, id: number }
  if (resource === 'users') {
    if (actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可管理账号')
    if (existing.role === 'SUPER_ADMIN' && actor.id !== id) {
      const requested = input.role
      if (requested && requested !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '不能降级其他超级管理员')
    }
    if (actor.id === id && input.status === 'DISABLED') fail(event, 400, 'SELF_DISABLE_FORBIDDEN', '不能停用当前登录账号')
  }
  if (resource === 'categories') await assertCategoryParent(id, input.parentId)
  const raw = { ...input }
  const data = cleanPayload(raw)
  if (resource === 'users' && raw.password) data.passwordHash = await hashPassword(String(raw.password))
  if (resource === 'products' && data.status === 'PUBLISHED') data.publishedAt = new Date()
  const updated = await prisma.$transaction(async (transaction) => {
    const transactionDelegates = resourceDelegates(transaction)
    const images = resource === 'products' && Array.isArray(raw.images)
      ? await validateProductImages(transaction, raw.images)
      : undefined
    const item = await transactionDelegates[resource].update({ where: { id }, data } as never)
    if (resource === 'products' && images) await replaceProductImages(transaction, id, images)
    await writeAudit(event, { adminUserId: actor.id, module: resource, action: data.status === 'PUBLISHED' ? 'PUBLISH' : 'UPDATE', targetType: resource, targetId: id, summary: `修改${resourceMeta[resource].model}` }, transaction)
    return resource === 'users'
      ? await transaction.adminUser.findUnique({ where: { id }, select: safeAdminUserSelect })
      : item
  })
  invalidateCache(...resourceMeta[resource].cache)
  return updated
}

export async function deleteResource(event: H3Event, resource: AdminResource, id: number, actor: AdminSession) {
  const existing = await getResource(event, resource, id) as { role?: string, id: number, relativePath?: string, storedName?: string, url?: string }
  if (resource === 'users') {
    if (actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可管理账号')
    if (actor.id === id) fail(event, 400, 'SELF_DELETE_FORBIDDEN', '不能删除当前登录账号')
    if (existing.role === 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '不能删除超级管理员')
  }
  if (resource === 'messages' && actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可删除留言')
  const deleted = await prisma.$transaction(async (transaction) => {
    if (resource === 'categories') {
      const [children, products] = await Promise.all([
        transaction.productCategory.count({ where: { parentId: id } }),
        transaction.product.count({ where: { categoryId: id } })
      ])
      if (children || products) fail(event, 409, 'CATEGORY_IN_USE', '分类下仍有子分类或产品，不能删除')
    }
    if (resource === 'media') {
      const references = existing.url ? await countDirectMediaReferences(transaction, existing.url, id) : 0
      if (references) fail(event, 409, 'MEDIA_IN_USE', '媒体文件仍被内容引用，不能删除')
    }
    const item = await resourceDelegates(transaction)[resource].delete({ where: { id } } as never)
    await writeAudit(event, { adminUserId: actor.id, module: resource, action: resource === 'media' ? 'DELETE_FILE' : 'DELETE', targetType: resource, targetId: id, summary: `删除${resourceMeta[resource].model}` }, transaction)
    return item
  })
  if (resource === 'media' && existing.relativePath && existing.storedName) {
    try {
      await deleteMediaFiles(existing.relativePath, existing.storedName)
    } catch (error) {
      console.error('[media-cleanup-error] 数据库记录已删除，但物理文件清理失败', error)
    }
  }
  invalidateCache(...resourceMeta[resource].cache)
  if (resource === 'users') {
    const { passwordHash: _passwordHash, ...safeUser } = deleted as { passwordHash: string } & Record<string, unknown>
    return safeUser
  }
  return deleted
}
