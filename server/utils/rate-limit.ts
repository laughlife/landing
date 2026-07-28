import { fail } from './response'
import type { H3Event } from 'h3'

type RateEntry = { count: number, expiresAt: number }
const entries = new Map<string, RateEntry>()
let callsSinceCleanup = 0

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key)
  }
}

export function enforceRateLimit(event: H3Event, key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  callsSinceCleanup += 1
  if (callsSinceCleanup >= 100 || entries.size >= 10_000) {
    cleanupExpiredEntries(now)
    callsSinceCleanup = 0
  }
  const previous = entries.get(key)
  const current = !previous || previous.expiresAt <= now ? { count: 0, expiresAt: now + windowMs } : previous
  current.count += 1
  entries.set(key, current)
  if (current.count > limit) fail(event, 429, 'RATE_LIMITED', '请求过于频繁，请稍后再试')
}

export function resetRateLimitsForTests(): void {
  if (process.env.NODE_ENV !== 'test') return
  entries.clear()
  callsSinceCleanup = 0
}
