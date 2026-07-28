import { describe, expect, it } from 'vitest'
import { mapKnownApiError } from '../../server/utils/api-error'

describe('admin API error mapping contract', () => {
  it('maps Prisma uniqueness and reference errors without exposing internals', () => {
    expect(mapKnownApiError({
      code: 'P2002',
      meta: { target: ['slug'], database: 'wysm' }
    })).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: '相同标识的数据已存在，请修改后重试'
    })

    expect(mapKnownApiError({
      code: 'P2003',
      message: 'portal_products_ibfk_1'
    })).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: '数据仍被其他内容引用，暂时不能执行此操作'
    })
  })

  it('maps missing records and validation errors to stable public codes', () => {
    expect(mapKnownApiError({ code: 'P2025' })?.code).toBe('NOT_FOUND')
    expect(mapKnownApiError({ statusCode: 400, statusMessage: '父分类不存在' })).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '父分类不存在'
    })
    expect(mapKnownApiError(new Error('database host and password'))).toBeNull()
  })
})
