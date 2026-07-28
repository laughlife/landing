import { type H3Event, getQuery, readBody } from 'h3'
import { ZodError, type ZodType } from 'zod'
import { fail } from './response'

export async function parseRequestBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  try {
    return schema.parse(await readBody(event))
  } catch (error) {
    if (error instanceof ZodError) fail(event, 400, 'VALIDATION_ERROR', error.issues[0]?.message ?? '请求参数无效')
    throw error
  }
}

export function parseRequestQuery<T>(event: H3Event, schema: ZodType<T>): T {
  try {
    return schema.parse(getQuery(event))
  } catch (error) {
    if (error instanceof ZodError) fail(event, 400, 'VALIDATION_ERROR', error.issues[0]?.message ?? '查询参数无效')
    throw error
  }
}
