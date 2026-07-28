import { requireAdminSession } from '../../../../utils/auth'
import { success } from '../../../../utils/response'
import { assertSameOrigin } from '../../../../utils/security'
import { copyProduct, resourceId } from '../../../../services/admin-resource'
import { withApiErrorBoundary } from '../../../../utils/api-error'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const actor = await requireAdminSession(event)
  const id = resourceId(event)
  return success(
    await withApiErrorBoundary(event, () => copyProduct(event, id, actor)),
    '产品复制成功，副本已保存为草稿'
  )
})
