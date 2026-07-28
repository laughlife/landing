import { z } from 'zod'

export const idSchema = z.coerce.number().int().positive()
export const slugSchema = z.string().trim().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug 只能包含小写字母、数字和连字符')
export const relativeUrlSchema = z.string().trim().max(1024).refine(value => value.startsWith('/') && !value.startsWith('//'), '必须为站内相对路径').optional().nullable()
export const externalUrlSchema = z.string().trim().url().refine(value => /^https?:\/\//i.test(value), '仅允许 HTTP 或 HTTPS 链接').optional().nullable()
export const jsonStringArraySchema = z.array(z.string().trim().min(1).max(500)).max(100)
export const richTextSchema = z.string().max(200_000).optional().nullable()
