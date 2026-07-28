export interface AdminApiResponse<T> {
  success: boolean
  data: T
  message: string
  code?: string
}

export type AdminRole = 'SUPER_ADMIN' | 'EDITOR'

export interface AdminUser {
  id: number
  username: string
  displayName: string
  role: AdminRole
}

interface AdminSessionData {
  authenticated?: boolean
  user?: AdminUser | null
}

interface AdminApiErrorData {
  message?: string
  code?: string
}

export class AdminApiError extends Error {
  statusCode: number
  code?: string

  constructor(message: string, statusCode = 500, code?: string) {
    super(message)
    this.name = 'AdminApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

function normalizeUser(data: AdminSessionData | AdminUser | null): AdminUser | null {
  if (!data) return null
  if ('user' in data) return data.user ?? null
  return 'id' in data ? data : null
}

function extractApiError(error: unknown): AdminApiError {
  const fetchError = error as {
    statusCode?: number
    status?: number
    statusMessage?: string
    message?: string
    data?: AdminApiErrorData
  }
  const message = fetchError.data?.message
    || fetchError.statusMessage
    || fetchError.message
    || '请求失败，请稍后重试'

  return new AdminApiError(
    message,
    fetchError.statusCode ?? fetchError.status ?? 500,
    fetchError.data?.code
  )
}

export function getAdminApiErrorMessage(error: unknown, fallback = '请求失败，请稍后重试') {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useAdminApi() {
  const currentUser = useState<AdminUser | null>('admin-current-user', () => null)
  const sessionResolved = useState<boolean>('admin-session-resolved', () => false)

  async function request<T>(path: string, options?: Parameters<typeof $fetch>[1]): Promise<T> {
    try {
      const response = await $fetch<AdminApiResponse<T>>(path, options)
      if (!response.success) {
        throw new AdminApiError(response.message || '请求失败', 400, response.code)
      }
      return response.data
    } catch (error) {
      if (error instanceof AdminApiError) throw error
      throw extractApiError(error)
    }
  }

  async function getSession(options: { force?: boolean } = {}) {
    if (sessionResolved.value && !options.force) return currentUser.value

    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const data = await request<AdminSessionData | AdminUser | null>('/api/auth/session', { headers })
      currentUser.value = normalizeUser(data)
      return currentUser.value
    } catch (error) {
      const apiError = extractApiError(error)
      currentUser.value = null
      if (apiError.statusCode !== 401) throw apiError
      return null
    } finally {
      sessionResolved.value = true
    }
  }

  async function login(username: string, password: string) {
    const data = await request<AdminSessionData | AdminUser>('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    })
    const user = normalizeUser(data)
    if (!user) throw new AdminApiError('登录成功，但未能读取管理员信息')
    currentUser.value = user
    sessionResolved.value = true
    return user
  }

  async function logout() {
    await request<null>('/api/auth/logout', { method: 'POST' })
    currentUser.value = null
    sessionResolved.value = true
  }

  return {
    currentUser: readonly(currentUser),
    sessionResolved: readonly(sessionResolved),
    request,
    getSession,
    login,
    logout
  }
}
