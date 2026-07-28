import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join, relative, resolve } from 'node:path'
import { getHeader, type H3Event } from 'h3'
import { fileTypeFromFile } from 'file-type'
import formidable, { type File } from 'formidable'
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

async function parseUploadedFile(event: H3Event): Promise<File> {
  const tempDirectory = resolve(uploadRoot(), '.tmp')
  await mkdir(tempDirectory, { recursive: true })
  try {
    const form = formidable({
      uploadDir: tempDirectory,
      maxFiles: 1,
      maxFileSize: 20 * 1024 * 1024,
      maxTotalFileSize: 21 * 1024 * 1024,
      minFileSize: 1,
      allowEmptyFiles: false,
      multiples: false
    })
    const [, files] = await form.parse(event.node.req)
    const upload = Array.isArray(files.file) ? files.file[0] : files.file
    if (!upload) fail(event, 400, 'VALIDATION_ERROR', '请选择要上传的文件')
    if (!isPathWithinRoot(tempDirectory, upload.filepath)) {
      await rm(upload.filepath, { force: true }).catch(() => undefined)
      fail(event, 400, 'INVALID_PATH', '临时文件路径无效')
    }
    return upload
  } catch (error) {
    const statusCode = Number((error as { httpCode?: number }).httpCode) === 413 ? 413 : 400
    fail(event, statusCode, statusCode === 413 ? 'UPLOAD_TOO_LARGE' : 'INVALID_UPLOAD', statusCode === 413 ? '上传请求过大' : '上传数据无效')
  }
}

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const contentLength = Number(getHeader(event, 'content-length') ?? 0)
  const maximum = 20 * 1024 * 1024 + 1024 * 1024
  if (!Number.isFinite(contentLength) || contentLength > maximum) return fail(event, 413, 'UPLOAD_TOO_LARGE', '上传请求过大')
  const upload = await parseUploadedFile(event)
  try {
    const detected = await fileTypeFromFile(upload.filepath)
    if (!detected || !allowed.has(detected.mime)) return fail(event, 400, 'UNSUPPORTED_FILE_TYPE', '仅支持 JPG、PNG、WebP、GIF 或 PDF 文件')
    const sizeLimit = detected.mime === 'application/pdf' ? 20 : 10
    if (upload.size > sizeLimit * 1024 * 1024) return fail(event, 413, 'UPLOAD_TOO_LARGE', `文件不能超过 ${sizeLimit} MB`)
    let width: number | null = null
    let height: number | null = null
    let processed: Buffer
    if (detected.mime.startsWith('image/') && detected.mime !== 'image/gif') {
      try {
        processed = await sharp(upload.filepath, { limitInputPixels: 40_000_000 }).rotate().toBuffer()
        const metadata = await sharp(processed, { limitInputPixels: 40_000_000 }).metadata()
        width = metadata.width ?? null
        height = metadata.height ?? null
      } catch { return fail(event, 400, 'INVALID_IMAGE', '图片内容无效') }
    } else {
      processed = await readFile(upload.filepath)
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
      await sharp(processed)
        .resize({ width: 320, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(join(directory, `${baseName}-thumb.webp`))
      for (const targetWidth of [480, 960, 1600]) {
        if (width && width > targetWidth) await sharp(processed).resize({ width: targetWidth, withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(directory, `${baseName}-${targetWidth}.webp`))
      }
    }
    const relativePath = relative(uploadRoot(), target).replace(/\\/g, '/')
    const media = await prisma.mediaFile.create({ data: { originalName: basename(upload.originalFilename || 'upload').slice(0, 512), storedName, relativePath, url: `/uploads/${relativePath}`, mimeType: detected.mime, extension: extname(storedName), size: processed.byteLength, width, height, checksum: createHash('sha256').update(processed).digest('hex'), category: detected.mime.startsWith('image/') ? 'IMAGE' : 'DOCUMENT', createdBy: actor.id } })
    await writeAudit(event, { adminUserId: actor.id, module: 'media', action: 'UPLOAD', targetType: 'MediaFile', targetId: media.id, summary: `上传文件 ${media.originalName}` })
    return success(media, '上传成功')
  } finally {
    await rm(upload.filepath, { force: true }).catch(() => undefined)
  }
})
