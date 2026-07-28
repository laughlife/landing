import { success } from '../../utils/response'
import { requireAdminSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  return success({ authenticated: true, user })
})
