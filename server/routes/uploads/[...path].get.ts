import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getRouterParam, setHeader, sendStream } from 'h3'
import { prisma } from '../../utils/db'
import { fail } from '../../utils/response'
import { isPathWithinRoot, isSafeRelativeUploadPath } from '../../utils/security'

function root(): string {
  return resolve(process.env.UPLOAD_DIR || './storage/uploads')
}

export default defineEventHandler(async (event) => {
  const relativePath = getRouterParam(event, 'path')
  if (!relativePath || !isSafeRelativeUploadPath(relativePath)) return fail(event, 404, 'NOT_FOUND', '文件不存在')
  const base = root()
  const target = resolve(base, relativePath)
  if (!isPathWithinRoot(base, target)) return fail(event, 404, 'NOT_FOUND', '文件不存在')
  const normalizedPath = relativePath.replace(/\\/g, '/')
  let media = await prisma.mediaFile.findUnique({ where: { relativePath: normalizedPath }, select: { mimeType: true } })
  if (!media) {
    const derived = normalizedPath.match(/^(.*)-(?:thumb|480|960|1600)\.webp$/)
    if (derived?.[1]) {
      media = await prisma.mediaFile.findFirst({
        where: {
          relativePath: { startsWith: `${derived[1]}.` },
          mimeType: { startsWith: 'image/' }
        },
        select: { mimeType: true }
      })
      if (media) media = { mimeType: 'image/webp' }
    }
  }
  if (!media) return fail(event, 404, 'NOT_FOUND', '文件不存在')
  try {
    await access(target)
    const info = await stat(target)
    if (!info.isFile()) return fail(event, 404, 'NOT_FOUND', '文件不存在')
  } catch {
    return fail(event, 404, 'NOT_FOUND', '文件不存在')
  }
  setHeader(event, 'Content-Type', media.mimeType)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', media.mimeType.startsWith('image/') ? 'public, max-age=31536000, immutable' : 'private, max-age=3600')
  return sendStream(event, createReadStream(target))
})
