import { z } from 'zod'
import { requireAdminSession, requireRole } from '../../utils/auth'
import { success } from '../../utils/response'
import { parseRequestQuery } from '../../utils/validation'
import { paginationQuerySchema } from '../../utils/pagination'
import { getAdminResource, listResource } from '../../services/admin-resource'

const adminListQuerySchema = paginationQuerySchema.extend({
  categoryId: z.coerce.number().int().positive().optional(),
  category: z.enum(['IMAGE', 'DOCUMENT', 'OTHER']).optional(),
  isFeatured: z.enum(['true', 'false']).transform(value => value === 'true').optional()
})

export default defineEventHandler(async (event) => {
  const resource = getAdminResource(event)
  if (resource === 'users') {
    await requireRole(event, ['SUPER_ADMIN'])
  } else {
    await requireAdminSession(event)
  }
  return success(await listResource(resource, parseRequestQuery(event, adminListQuerySchema)))
})
