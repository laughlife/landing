export default defineNuxtRouteMiddleware(async (to) => {
  const { getSession } = useAdminApi()
  const isLoginPage = to.path === '/admin/login'

  try {
    const user = await getSession()
    if (isLoginPage && user) return navigateTo('/admin')
    if (!isLoginPage && !user) {
      return navigateTo({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
    }
  } catch {
    if (!isLoginPage) {
      return navigateTo({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
    }
  }
})
