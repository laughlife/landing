import { requireAdminSession } from '../../../utils/auth'
import { success } from '../../../utils/response'
import { assertSameOrigin } from '../../../utils/security'
import { deleteResource, getAdminResource, resourceId } from '../../../services/admin-resource'
import { withApiErrorBoundary } from '../../../utils/api-error'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const resource = getAdminResource(event)
  const id = resourceId(event)
  return success(await withApiErrorBoundary(event, () => deleteResource(event, resource, id, actor)), '删除成功')
})
