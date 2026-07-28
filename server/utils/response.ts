import { createError, setResponseStatus, type H3Event } from 'h3'

export type ApiSuccess<T> = { success: true, data: T, message: string }

export function success<T>(data: T, message = '操作成功'): ApiSuccess<T> {
  return { success: true, data, message }
}

export function fail(event: H3Event, statusCode: number, code: string, message: string): never {
  setResponseStatus(event, statusCode)
  throw createError({ statusCode, statusMessage: message, data: { success: false, data: null, message, code } })
}

export function notFound(event: H3Event, message = '资源不存在'): never {
  return fail(event, 404, 'NOT_FOUND', message)
}
