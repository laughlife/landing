export default defineNuxtRouteMiddleware(async () => {
  const { getSession } = useAdminApi()
  const user = await getSession()

  if (user?.role !== 'SUPER_ADMIN') {
    return navigateTo('/admin')
  }
})
