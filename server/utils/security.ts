import { getHeader, getRequestIP, getRequestURL, type H3Event } from 'h3'
import { isAbsolute, relative, resolve } from 'node:path'
import sanitizeHtml from 'sanitize-html'
import { fail } from './response'

const TRUSTED_TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
const TRUSTED_ATTRIBUTES = { a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] }

export function sanitizeRichText(value: string | null | undefined): string | null {
  if (!value) return null
  return sanitizeHtml(value, { allowedTags: TRUSTED_TAGS, allowedAttributes: TRUSTED_ATTRIBUTES, allowedSchemes: ['http', 'https'] })
}

export function normalizeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch { return null }
}

export function isSafeExternalUrl(value: string): boolean {
  return normalizeExternalUrl(value) !== null
}

export function isSafeRelativeUploadPath(value: string): boolean {
  if (!value || value.includes('\0') || value.includes('\\')) return false
  const normalized = value.replace(/\\/g, '/')
  return !normalized.startsWith('/') && !normalized.split('/').includes('..')
}

export function isPathWithinRoot(root: string, candidate: string): boolean {
  const relativePath = relative(resolve(root), resolve(candidate))
  return relativePath !== '' && !relativePath.startsWith('..') && !isAbsolute(relativePath)
}

export function assertSameOrigin(event: H3Event): void {
  const origin = getHeader(event, 'origin')
  if (!origin) {
    if (process.env.NODE_ENV === 'production') fail(event, 403, 'CSRF_REJECTED', '缺少请求来源')
    return
  }
  const requestUrl = getRequestURL(event)
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    fail(event, 403, 'CSRF_REJECTED', '请求来源无效')
  }
  if (parsed.host !== requestUrl.host || parsed.protocol !== requestUrl.protocol) fail(event, 403, 'CSRF_REJECTED', '请求来源不被允许')
}

export function requestContext(event: H3Event): { ipAddress: string | null, userAgent: string | null } {
  return { ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null, userAgent: getHeader(event, 'user-agent')?.slice(0, 512) ?? null }
}
