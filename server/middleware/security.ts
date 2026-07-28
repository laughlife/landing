import { getHeader, setHeader } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (event.path.startsWith('/api/') && event.method !== 'GET' && event.method !== 'HEAD') {
    const length = Number(getHeader(event, 'content-length') ?? 0)
    if (Number.isFinite(length) && length > 22 * 1024 * 1024) {
      event.node.res.statusCode = 413
      return { success: false, data: null, message: '请求内容过大', code: 'REQUEST_TOO_LARGE' }
    }
  }
})
