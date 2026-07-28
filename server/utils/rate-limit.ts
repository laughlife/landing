import { fail } from './response'
import type { H3Event } from 'h3'

type RateEntry = { count: number, expiresAt: number }
const entries = new Map<string, RateEntry>()

export function enforceRateLimit(event: H3Event, key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const previous = entries.get(key)
  const current = !previous || previous.expiresAt <= now ? { count: 0, expiresAt: now + windowMs } : previous
  current.count += 1
  entries.set(key, current)
  if (current.count > limit) fail(event, 429, 'RATE_LIMITED', '请求过于频繁，请稍后再试')
}
