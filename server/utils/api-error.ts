import type { H3Event } from 'h3'
import { fail } from './response'

type ErrorRecord = {
  code?: unknown
  statusCode?: unknown
  statusMessage?: unknown
  data?: unknown
}

export type ApiErrorMapping = {
  statusCode: number
  code: string
  message: string
}

function asErrorRecord(error: unknown): ErrorRecord {
  return error && typeof error === 'object' ? error as ErrorRecord : {}
}

function isNormalizedApiFailure(error: ErrorRecord): boolean {
  if (!error.data || typeof error.data !== 'object') return false
  return (error.data as { success?: unknown }).success === false
}

export function mapKnownApiError(error: unknown): ApiErrorMapping | null {
  const record = asErrorRecord(error)

  if (record.code === 'P2002') {
    return { statusCode: 409, code: 'CONFLICT', message: '相同标识的数据已存在，请修改后重试' }
  }
  if (record.code === 'P2003') {
    return { statusCode: 409, code: 'CONFLICT', message: '数据仍被其他内容引用，暂时不能执行此操作' }
  }
  if (record.code === 'P2025') {
    return { statusCode: 404, code: 'NOT_FOUND', message: '要操作的数据不存在或已被删除' }
  }
  if (record.statusCode === 400) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: typeof record.statusMessage === 'string' ? record.statusMessage : '请求参数无效'
    }
  }

  return null
}

export async function withApiErrorBoundary<T>(event: H3Event, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const record = asErrorRecord(error)
    if (isNormalizedApiFailure(record)) throw error

    const mapped = mapKnownApiError(error)
    if (mapped) return fail(event, mapped.statusCode, mapped.code, mapped.message)

    console.error('[portal-api-error] 未处理的服务端异常', error)
    return fail(event, 500, 'INTERNAL_ERROR', '服务器暂时无法处理请求，请稍后重试')
  }
}
