import { requireAdminSession } from '../../utils/auth'
import { success } from '../../utils/response'
import { parseRequestQuery } from '../../utils/validation'
import { paginationQuerySchema } from '../../utils/pagination'
import { getAdminResource, listResource } from '../../services/admin-resource'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const resource = getAdminResource(event)
  return success(await listResource(resource, parseRequestQuery(event, paginationQuerySchema)))
})
