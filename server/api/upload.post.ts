import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { getHeader, readMultipartFormData } from 'h3'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'
import { requireAdminSession } from '../utils/auth'
import { prisma } from '../utils/db'
import { success, fail } from '../utils/response'
import { assertSameOrigin, isPathWithinRoot } from '../utils/security'
import { writeAudit } from '../utils/audit'

const allowed = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif'], ['application/pdf', '.pdf']])

function uploadRoot(): string {
  return resolve(process.env.UPLOAD_DIR || './storage/uploads')
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const contentLength = Number(getHeader(event, 'content-length') ?? 0)
  const maximum = 20 * 1024 * 1024 + 1024 * 1024
  if (!Number.isFinite(contentLength) || contentLength > maximum) return fail(event, 413, 'UPLOAD_TOO_LARGE', '上传请求过大')
  const parts = await readMultipartFormData(event)
  const part = parts?.find(item => item.name === 'file' && item.filename && item.data)
  if (!part?.data || !part.filename) return fail(event, 400, 'VALIDATION_ERROR', '请选择要上传的文件')
  const detected = await fileTypeFromBuffer(part.data)
  if (!detected || !allowed.has(detected.mime) || (part.type && part.type !== detected.mime)) return fail(event, 400, 'UNSUPPORTED_FILE_TYPE', '仅支持 JPG、PNG、WebP、GIF 或 PDF 文件')
  const sizeLimit = detected.mime === 'application/pdf' ? 20 : 10
  if (part.data.byteLength > sizeLimit * 1024 * 1024) return fail(event, 413, 'UPLOAD_TOO_LARGE', `文件不能超过 ${sizeLimit} MB`)
  let width: number | null = null
  let height: number | null = null
  let processed = part.data
  if (detected.mime.startsWith('image/') && detected.mime !== 'image/gif') {
    try {
      processed = await sharp(part.data, { limitInputPixels: 40_000_000 }).rotate().toBuffer()
      const metadata = await sharp(processed, { limitInputPixels: 40_000_000 }).metadata()
      width = metadata.width ?? null
      height = metadata.height ?? null
    } catch { return fail(event, 400, 'INVALID_IMAGE', '图片内容无效') }
  }
  const now = new Date()
  const directory = join(uploadRoot(), now.getFullYear().toString(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'))
  await mkdir(directory, { recursive: true })
  const storedName = `${randomUUID()}${allowed.get(detected.mime)}`
  const target = resolve(directory, storedName)
  if (!isPathWithinRoot(uploadRoot(), target)) return fail(event, 400, 'INVALID_PATH', '文件路径无效')
  await writeFile(target, processed, { flag: 'wx' })
  if (detected.mime.startsWith('image/') && detected.mime !== 'image/gif') {
    const baseName = storedName.replace(extname(storedName), '')
    for (const targetWidth of [480, 960, 1600]) {
      if (width && width > targetWidth) await sharp(processed).resize({ width: targetWidth, withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(directory, `${baseName}-${targetWidth}.webp`))
    }
  }
  const relativePath = relative(uploadRoot(), target).replace(/\\/g, '/')
  const media = await prisma.mediaFile.create({ data: { originalName: basename(part.filename).slice(0, 512), storedName, relativePath, url: `/uploads/${relativePath}`, mimeType: detected.mime, extension: extname(storedName), size: processed.byteLength, width, height, checksum: createHash('sha256').update(processed).digest('hex'), category: detected.mime.startsWith('image/') ? 'IMAGE' : 'DOCUMENT', createdBy: actor.id } })
  await writeAudit(event, { adminUserId: actor.id, module: 'media', action: 'UPLOAD', targetType: 'MediaFile', targetId: media.id, summary: `上传文件 ${media.originalName}` })
  return success(media, '上传成功')
})
