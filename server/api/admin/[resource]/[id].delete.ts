import { requireAdminSession } from '../../../utils/auth'
import { success } from '../../../utils/response'
import { assertSameOrigin } from '../../../utils/security'
import { deleteResource, getAdminResource, resourceId } from '../../../services/admin-resource'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const resource = getAdminResource(event)
  return success(await deleteResource(event, resource, resourceId(event), actor), '删除成功')
})
