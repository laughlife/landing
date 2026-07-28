import { z } from 'zod'
import { slugSchema } from './common'

export const contactMessageSchema = z.object({
  name: z.string().trim().min(1, '请填写姓名').max(100),
  company: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(64).optional().nullable(),
  email: z.string().trim().email('邮箱格式不正确').max(254).optional().nullable(),
  subject: z.string().trim().max(255).optional().nullable(),
  message: z.string().trim().min(5, '留言内容至少 5 个字符').max(5000),
  sourcePage: z.string().trim().max(1024).optional().nullable(),
  productId: z.coerce.number().int().positive().optional().nullable(),
  website: z.string().max(0).optional().default('')
}).refine(value => Boolean(value.phone || value.email), { message: '请至少填写电话或邮箱', path: ['phone'] })

export const publicSlugSchema = slugSchema
