import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(100).optional(),
  status: z.string().trim().max(30).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(30).optional(),
  isFeatured: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
  sortBy: z.string().trim().max(40).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export function pageMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
}

export function safeOrderBy(field: string | undefined, allowed: readonly string[], direction: 'asc' | 'desc', fallback: string) {
  return { [allowed.includes(field ?? '') ? field! : fallback]: direction }
}
