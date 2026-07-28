import { createError, getRouterParam, type H3Event } from 'h3'
import { readdir, rm } from 'node:fs/promises'
import { dirname, extname, join, parse, resolve } from 'node:path'
import { prisma } from '../utils/db'
import { notFound, fail } from '../utils/response'
import { isPathWithinRoot, isSafeRelativeUploadPath, sanitizeRichText } from '../utils/security'
import { invalidateCache } from '../utils/cache'
import { writeAudit } from '../utils/audit'
import type { AdminSession } from '../utils/auth'

export type AdminResource = 'products' | 'categories' | 'partners' | 'services' | 'banners' | 'articles' | 'messages' | 'media' | 'users'
type Delegate = { findMany: (input?: never) => Promise<unknown[]>, findUnique: (input: never) => Promise<unknown>, count: (input?: never) => Promise<number>, create: (input: never) => Promise<unknown>, update: (input: never) => Promise<unknown>, delete: (input: never) => Promise<unknown> }

const delegates: Record<AdminResource, Delegate> = {
  products: prisma.product as unknown as Delegate,
  categories: prisma.productCategory as unknown as Delegate,
  partners: prisma.partner as unknown as Delegate,
  services: prisma.serviceItem as unknown as Delegate,
  banners: prisma.banner as unknown as Delegate,
  articles: prisma.article as unknown as Delegate,
  messages: prisma.contactMessage as unknown as Delegate,
  media: prisma.mediaFile as unknown as Delegate,
  users: prisma.adminUser as unknown as Delegate
}

const resourceMeta: Record<AdminResource, { model: string, search: string[], sort: string[], cache: string[] }> = {
  products: { model: '产品', search: ['name', 'model', 'summary'], sort: ['createdAt', 'updatedAt', 'sortOrder', 'name', 'publishedAt'], cache: ['products', 'home'] },
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
  delete data.imageIds
  delete data.password
  return data
}

export async function listResource(resource: AdminResource, query: { page: number, pageSize: number, keyword?: string, status?: string, categoryId?: number, category?: string, isFeatured?: boolean, sortBy?: string, sortOrder: 'asc' | 'desc' }) {
  const meta = resourceMeta[resource]
  const delegate = delegates[resource]
  const sortBy = meta.sort.includes(query.sortBy ?? '') ? query.sortBy! : 'updatedAt'
  const where: Record<string, unknown> = {}
  if (query.status) where.status = query.status
  if (resource === 'products' && query.categoryId) where.categoryId = query.categoryId
  if (resource === 'products' && query.isFeatured !== undefined) where.isFeatured = query.isFeatured
  if (resource === 'media' && query.category) where.category = query.category
  if (query.keyword) where.OR = meta.search.map(field => ({ [field]: { contains: query.keyword } }))
  const options = { where, orderBy: { [sortBy]: query.sortOrder }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }
  const itemsPromise = resource === 'products'
    ? prisma.product.findMany({ ...options, include: { category: { select: { id: true, name: true, slug: true } }, images: { orderBy: { sortOrder: 'asc' }, include: { media: { select: { id: true, url: true, mimeType: true } } } } } })
    : resource === 'categories'
      ? prisma.productCategory.findMany({ ...options, include: { parent: { select: { id: true, name: true, slug: true } }, children: { select: { id: true, name: true, slug: true, sortOrder: true, status: true }, orderBy: { sortOrder: 'asc' } } } })
      : delegate.findMany(options as never)
  const [items, total] = await Promise.all([itemsPromise, delegate.count({ where } as never)])
  return { items, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) }
}

export async function getResource(event: H3Event, resource: AdminResource, id: number) {
  const item = resource === 'products'
    ? await prisma.product.findUnique({ where: { id }, include: { category: true, images: { orderBy: { sortOrder: 'asc' }, include: { media: true } } } })
    : resource === 'categories'
      ? await prisma.productCategory.findUnique({ where: { id }, include: { parent: true, children: { orderBy: { sortOrder: 'asc' } } } })
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

async function setProductImages(productId: number, imageIds: unknown): Promise<void> {
  if (!Array.isArray(imageIds)) return
  const mediaIds = imageIds.map(value => Number(value))
  if (!mediaIds.length) {
    await prisma.productImage.deleteMany({ where: { productId } })
    return
  }
  const count = await prisma.mediaFile.count({ where: { id: { in: mediaIds } } })
  if (count !== mediaIds.length) throw createError({ statusCode: 400, statusMessage: '存在无效图片' })
  const media = await prisma.mediaFile.findMany({ where: { id: { in: mediaIds } }, select: { id: true, url: true } })
  const urls = new Map(media.map(item => [item.id, item.url]))
  await prisma.$transaction(async (transaction) => {
    await transaction.productImage.deleteMany({ where: { productId } })
    if (mediaIds.length) await transaction.productImage.createMany({ data: mediaIds.map((mediaId, index) => ({ productId, mediaId, imageUrl: urls.get(mediaId)!, sortOrder: index })) })
  })
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

export async function createResource(event: H3Event, resource: AdminResource, input: Record<string, unknown>, actor: AdminSession) {
  if (resource === 'users' && actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可管理账号')
  if (resource === 'media') fail(event, 405, 'METHOD_NOT_ALLOWED', '请使用上传接口创建媒体')
  if (resource === 'categories') await assertCategoryParent(-1, input.parentId)
  const raw = { ...input }
  const data = cleanPayload(raw)
  if (resource === 'users') data.passwordHash = await hashPassword(String(raw.password))
  if (resource === 'products' && data.status === 'PUBLISHED') data.publishedAt = new Date()
  const created = await delegates[resource].create({ data } as never) as { id: number }
  if (resource === 'products') await setProductImages(created.id, raw.imageIds)
  await writeAudit(event, { adminUserId: actor.id, module: resource, action: data.status === 'PUBLISHED' ? 'PUBLISH' : 'CREATE', targetType: resource, targetId: created.id, summary: `新增${resourceMeta[resource].model}` })
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
  }
  if (resource === 'categories') await assertCategoryParent(id, input.parentId)
  const raw = { ...input }
  const data = cleanPayload(raw)
  if (resource === 'users' && raw.password) data.passwordHash = await hashPassword(String(raw.password))
  if (resource === 'products' && data.status === 'PUBLISHED') data.publishedAt = new Date()
  const updated = await delegates[resource].update({ where: { id }, data } as never)
  if (resource === 'products') await setProductImages(id, raw.imageIds)
  await writeAudit(event, { adminUserId: actor.id, module: resource, action: data.status === 'PUBLISHED' ? 'PUBLISH' : 'UPDATE', targetType: resource, targetId: id, summary: `修改${resourceMeta[resource].model}` })
  invalidateCache(...resourceMeta[resource].cache)
  return updated
}

export async function deleteResource(event: H3Event, resource: AdminResource, id: number, actor: AdminSession) {
  const existing = await getResource(event, resource, id) as { role?: string, id: number, relativePath?: string, storedName?: string }
  if (resource === 'users') {
    if (actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可管理账号')
    if (actor.id === id) fail(event, 400, 'SELF_DELETE_FORBIDDEN', '不能删除当前登录账号')
    if (existing.role === 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '不能删除超级管理员')
  }
  if (resource === 'messages' && actor.role !== 'SUPER_ADMIN') fail(event, 403, 'FORBIDDEN', '仅超级管理员可删除留言')
  if (resource === 'categories') {
    const [children, products] = await Promise.all([prisma.productCategory.count({ where: { parentId: id } }), prisma.product.count({ where: { categoryId: id } })])
    if (children || products) fail(event, 409, 'CATEGORY_IN_USE', '分类下仍有子分类或产品，不能删除')
  }
  if (resource === 'media') {
    const [images, references] = await Promise.all([prisma.productImage.count({ where: { mediaId: id } }), prisma.mediaReference.count({ where: { mediaId: id } })])
    if (images || references) fail(event, 409, 'MEDIA_IN_USE', '媒体文件仍被内容引用，不能删除')
  }
  const deleted = await delegates[resource].delete({ where: { id } } as never)
  if (resource === 'media' && existing.relativePath && existing.storedName) await deleteMediaFiles(existing.relativePath, existing.storedName)
  await writeAudit(event, { adminUserId: actor.id, module: resource, action: resource === 'media' ? 'DELETE_FILE' : 'DELETE', targetType: resource, targetId: id, summary: `删除${resourceMeta[resource].model}` })
  invalidateCache(...resourceMeta[resource].cache)
  return deleted
}
