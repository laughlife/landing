import { requireAdminSession } from '../../utils/auth'
import { prisma } from '../../utils/db'
import { success } from '../../utils/response'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  return success(await prisma.companyProfile.findUnique({ where: { id: 1 } }))
})
