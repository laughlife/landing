import { z } from 'zod'
import { requireAdminSession } from '../../utils/auth'
import { paginationQuerySchema } from '../../utils/pagination'
import { success } from '../../utils/response'
import { parseRequestQuery } from '../../utils/validation'
import { listResource } from '../../services/admin-resource'

const mediaListQuerySchema = paginationQuerySchema.extend({
  category: z.enum(['IMAGE', 'DOCUMENT', 'OTHER']).optional()
})

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const query = parseRequestQuery(event, mediaListQuerySchema)
  return success(await listResource('media', query))
})
