import { describe, expect, it } from 'vitest'
import { contactMessageSchema } from '../../server/validators/contact'

describe('contact validator contract', () => {
  const validMessage = {
    name: '测试联系人',
    company: '测试公司',
    phone: '13800138000',
    email: 'contact@example.com',
    subject: '产品咨询',
    message: '请提供产品资料和合作方式。',
    sourcePage: '/contact',
    website: ''
  }

  it('accepts a normal consultation message', () => {
    expect(contactMessageSchema.safeParse(validMessage).success).toBe(true)
  })

  it('rejects a malformed email and obvious honeypot submission', () => {
    expect(contactMessageSchema.safeParse({ ...validMessage, email: 'not-an-email' }).success).toBe(false)
    expect(contactMessageSchema.safeParse({ ...validMessage, website: 'https://spam.example' }).success).toBe(false)
  })
})
