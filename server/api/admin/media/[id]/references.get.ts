import { requireAdminSession } from '../../../../utils/auth'
import { prisma } from '../../../../utils/db'
import { notFound, success } from '../../../../utils/response'
import { findMediaUsages } from '../../../../services/media-reference'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id < 1) return notFound(event, '媒体文件不存在')

  const media = await prisma.mediaFile.findUnique({
    where: { id },
    select: { id: true, originalName: true, url: true }
  })
  if (!media) return notFound(event, '媒体文件不存在')

  const references = await findMediaUsages(prisma, media.id, media.url)
  return success({ media, references, total: references.length })
})
