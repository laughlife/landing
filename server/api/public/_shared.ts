import type { Prisma } from '../../generated/prisma/client'
import { normalizeExternalUrl, sanitizeRichText } from '../../utils/security'

export const productSelect = {
  id: true, name: true, slug: true, model: true, subtitle: true, summary: true,
  description: true, coverImage: true, features: true, applications: true,
  specifications: true, seoTitle: true, seoKeywords: true, seoDescription: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { select: { id: true, imageUrl: true, altText: true }, orderBy: { sortOrder: 'asc' } }
} satisfies Prisma.ProductSelect

export const productCardSelect = {
  id: true, name: true, slug: true, model: true, subtitle: true, summary: true,
  coverImage: true, publishedAt: true,
  category: { select: { id: true, name: true, slug: true } }
} satisfies Prisma.ProductSelect

export const serviceSelect = {
  id: true, name: true, slug: true, icon: true, coverImage: true, summary: true,
  description: true, features: true, processSteps: true, seoTitle: true, seoDescription: true
} satisfies Prisma.ServiceItemSelect

export const partnerSelect = {
  id: true, name: true, slug: true, logo: true, coverImage: true, summary: true,
  description: true, website: true, cooperationType: true, seoTitle: true, seoDescription: true
} satisfies Prisma.PartnerSelect

export const articleSelect = {
  id: true, title: true, slug: true, summary: true, content: true, coverImage: true,
  author: true, seoTitle: true, seoKeywords: true, seoDescription: true, publishedAt: true
} satisfies Prisma.ArticleSelect

export function publicRichText<T extends { description?: string | null; content?: string | null; fullDescription?: string | null; businessScope?: string | null }>(value: T): T {
  return {
    ...value,
    ...(Object.hasOwn(value, 'description') ? { description: sanitizeRichText(value.description) } : {}),
    ...(Object.hasOwn(value, 'content') ? { content: sanitizeRichText(value.content) } : {}),
    ...(Object.hasOwn(value, 'fullDescription') ? { fullDescription: sanitizeRichText(value.fullDescription) } : {}),
    ...(Object.hasOwn(value, 'businessScope') ? { businessScope: sanitizeRichText(value.businessScope) } : {})
  }
}

export function publicPartner<T extends { description?: string | null; website?: string | null }>(value: T): T {
  return { ...publicRichText(value), ...(Object.hasOwn(value, 'website') ? { website: normalizeExternalUrl(value.website) } : {}) }
}

export function publicCategories<T extends { description?: string | null; children?: unknown[] }>(categories: T[]): T[] {
  return categories.map((category) => {
    const { children, ...categoryFields } = category
    return {
      ...publicRichText(categoryFields),
      ...(Array.isArray(children) ? { children: publicCategories(children as Array<{ description?: string | null; children?: unknown[] }>) } : {})
    } as T
  })
}
