import { requireAdminSession } from '../../../utils/auth'
import { success } from '../../../utils/response'
import { getAdminResource, getResource, resourceId } from '../../../services/admin-resource'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const resource = getAdminResource(event)
  return success(await getResource(event, resource, resourceId(event)))
})
