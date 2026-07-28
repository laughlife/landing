import { requireAdminSession, requireRole } from '../../../utils/auth'
import { success } from '../../../utils/response'
import { getAdminResource, getResource, resourceId } from '../../../services/admin-resource'

export default defineEventHandler(async (event) => {
  const resource = getAdminResource(event)
  if (resource === 'users') {
    await requireRole(event, ['SUPER_ADMIN'])
  } else {
    await requireAdminSession(event)
  }
  return success(await getResource(event, resource, resourceId(event)))
})
