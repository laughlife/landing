import { access } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type APIResponse, type Page } from '@playwright/test'
import { prisma } from '../../server/utils/db'

type ApiEnvelope<T> = { success: boolean, data: T, message: string, code?: string }
type H3ErrorEnvelope = { data?: ApiEnvelope<null> }

const baseURL = 'http://127.0.0.1:3101'
const originHeaders = { Origin: baseURL }

async function expectApiError(response: APIResponse, status: number, code: string) {
  expect(response.status()).toBe(status)
  const body = await response.json() as H3ErrorEnvelope
  expect(body.data).toMatchObject({ success: false, data: null, code })
  expect(JSON.stringify(body.data)).not.toMatch(/passwordHash|DATABASE_URL|NUXT_SESSION_PASSWORD|mysql:|Prisma|P20\d{3}/i)
}

async function fileExists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function login(page: Page, username: string, password: string) {
  await page.goto('/admin/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[autocomplete="username"]').fill(username)
  await page.locator('input[autocomplete="current-password"]').fill(password)
  const loginResponse = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: '登录', exact: true }).click()
  expect((await loginResponse).status()).toBe(200)
  await expect(page).toHaveURL('/admin')
  await expect.poll(async () => (await page.request.get('/api/auth/session')).status()).toBe(200)
  const adminResponse = await page.goto('/admin', { waitUntil: 'domcontentloaded' })
  expect(adminResponse?.status()).toBe(200)
  await expect(page).toHaveURL('/admin')
}

test('后台权限、产品、上传与角色边界形成闭环', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  test.skip(testInfo.project.name !== 'chromium', '后台写入流程只在桌面 Chromium 执行一次')

  const superUsername = process.env.ADMIN_INITIAL_USERNAME
  const superPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!superUsername || !superPassword) throw new Error('E2E requires seeded administrator credentials.')

  const startedAt = new Date()
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const editorUsername = `qa_editor_${runId.replaceAll('-', '_')}`
  const editorPassword = `Qa!${runId}SecurePassword`
  const productSlug = `qa-product-${runId}`
  const productName = `E2E 测试产品 ${runId}`
  let editorId: number | undefined
  let productId: number | undefined
  let mediaId: number | undefined
  let uploadedUrl: string | undefined
  let uploadedPath: string | undefined
  let thumbnailPath: string | undefined

  const anonymousResponse = await page.request.get('/api/admin/dashboard')
  await expectApiError(anonymousResponse, 401, 'UNAUTHORIZED')
  await page.goto('/admin/company')
  await expect(page).toHaveURL(/\/admin\/login/)
  expect(new URL(page.url()).searchParams.get('redirect')).toBe('/admin/company')

  const wrongLoginResponse = await page.request.post('/api/auth/login', {
    headers: originHeaders,
    data: { username: superUsername, password: 'definitely-wrong-password' }
  })
  await expectApiError(wrongLoginResponse, 401, 'INVALID_CREDENTIALS')

  try {
    await login(page, superUsername, superPassword)
    await expect(page.getByRole('link', { name: '管理员管理' })).toBeVisible()
    await expect(page.getByRole('link', { name: '操作日志' })).toBeVisible()

    const sessionResponse = await page.request.get('/api/auth/session')
    expect(sessionResponse.status()).toBe(200)
    const sessionBody = await sessionResponse.json() as ApiEnvelope<{
      authenticated: boolean
      user: { id: number, username: string, displayName: string, role: string }
    }>
    expect(sessionBody.data.authenticated).toBe(true)
    expect(sessionBody.data.user).toMatchObject({ username: superUsername, role: 'SUPER_ADMIN' })
    expect(Object.keys(sessionBody.data.user).sort()).toEqual(['displayName', 'id', 'role', 'username'])
    expect(JSON.stringify(sessionBody)).not.toMatch(/passwordHash|password|DATABASE_URL|NUXT_SESSION_PASSWORD|mysql:|Prisma/i)

    const editorResponse = await page.request.post('/api/admin/users', {
      headers: originHeaders,
      data: {
        username: editorUsername,
        password: editorPassword,
        displayName: 'E2E 内容编辑',
        role: 'EDITOR',
        status: 'ENABLED'
      }
    })
    expect(editorResponse.status()).toBe(200)
    editorId = (await editorResponse.json() as ApiEnvelope<{ id: number }>).data.id

    const categoriesResponse = await page.request.get('/api/admin/categories?pageSize=1&sortBy=sortOrder&sortOrder=asc')
    expect(categoriesResponse.status()).toBe(200)
    const categories = await categoriesResponse.json() as ApiEnvelope<{ items: Array<{ id: number }> }>
    const categoryId = categories.data.items[0]?.id
    expect(categoryId).toBeTruthy()

    const productResponse = await page.request.post('/api/admin/products', {
      headers: originHeaders,
      data: {
        categoryId,
        name: productName,
        slug: productSlug,
        status: 'DRAFT',
        images: []
      }
    })
    expect(productResponse.status()).toBe(200)
    productId = (await productResponse.json() as ApiEnvelope<{ id: number }>).data.id

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    const uploadResponse = await page.request.post('/api/upload', {
      headers: originHeaders,
      multipart: {
        file: {
          name: `qa-${runId}.png`,
          mimeType: 'image/png',
          buffer: png
        }
      }
    })
    expect(uploadResponse.status()).toBe(200)
    const uploaded = await uploadResponse.json() as ApiEnvelope<{ id: number, url: string, mimeType: string }>
    mediaId = uploaded.data.id
    uploadedUrl = uploaded.data.url
    expect(uploaded.data.mimeType).toBe('image/png')
    expect(uploaded.data.url).toMatch(/^\/uploads\//)
    expect((await page.request.get(uploaded.data.url)).status()).toBe(200)
    const uploadRoot = resolve('storage/test-uploads')
    uploadedPath = resolve(uploadRoot, uploaded.data.url.replace(/^\/uploads\//, ''))
    if (!uploadedPath.startsWith(`${uploadRoot}${sep}`)) throw new Error('Uploaded file escaped the isolated upload directory.')
    thumbnailPath = uploadedPath.replace(new RegExp(`${extname(uploadedPath)}$`), '-thumb.webp')
    expect(await fileExists(uploadedPath)).toBe(true)
    expect(await fileExists(thumbnailPath)).toBe(true)

    const productUpdateResponse = await page.request.patch(`/api/admin/products/${productId}`, {
      headers: originHeaders,
      data: {
        categoryId,
        name: productName,
        slug: productSlug,
        status: 'DRAFT',
        images: [{ mediaId, altText: 'E2E 产品图片' }]
      }
    })
    expect(productUpdateResponse.status()).toBe(200)
    await expectApiError(
      await page.request.delete(`/api/admin/media/${mediaId}`, { headers: originHeaders }),
      409,
      'MEDIA_IN_USE'
    )

    expect((await page.request.post('/api/auth/logout', { headers: originHeaders })).status()).toBe(200)
    await login(page, editorUsername, editorPassword)
    await expect(page.getByRole('link', { name: '管理员管理' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '操作日志' })).toHaveCount(0)
    await expectApiError(await page.request.get('/api/admin/users'), 403, 'FORBIDDEN')
    await expectApiError(await page.request.get('/api/admin/audit-logs'), 403, 'FORBIDDEN')
    const editorDashboardResponse = await page.request.get('/api/admin/dashboard')
    expect(editorDashboardResponse.status()).toBe(200)
    const editorDashboard = await editorDashboardResponse.json() as ApiEnvelope<Record<string, unknown>>
    expect(editorDashboard.data).not.toHaveProperty('recentLogs')
    await page.goto('/admin/users')
    await expect(page).toHaveURL('/admin')
    expect((await page.request.post('/api/auth/logout', { headers: originHeaders })).status()).toBe(200)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
    expect(new URL(page.url()).searchParams.get('redirect')).toBe('/admin')
  } finally {
    const cleanupFailures: string[] = []
    if (editorId || productId || mediaId) {
      await page.request.post('/api/auth/logout', { headers: originHeaders }).catch(() => undefined)
      const cleanupLogin = await page.request.post('/api/auth/login', {
        headers: originHeaders,
        data: { username: superUsername, password: superPassword }
      })
      if (cleanupLogin.status() !== 200) cleanupFailures.push(`cleanup login returned ${cleanupLogin.status()}`)
      if (productId) {
        const response = await page.request.delete(`/api/admin/products/${productId}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`product ${productId} delete returned ${response.status()}`)
      }
      if (mediaId) {
        const response = await page.request.delete(`/api/admin/media/${mediaId}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`media ${mediaId} delete returned ${response.status()}`)
        if (uploadedUrl && (await page.request.get(uploadedUrl)).status() !== 404) cleanupFailures.push(`uploaded URL ${uploadedUrl} is still available`)
        if (uploadedPath && await fileExists(uploadedPath)) cleanupFailures.push(`uploaded file ${uploadedPath} still exists`)
        if (thumbnailPath && await fileExists(thumbnailPath)) cleanupFailures.push(`thumbnail ${thumbnailPath} still exists`)
      }
      if (editorId) {
        const response = await page.request.delete(`/api/admin/users/${editorId}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`editor ${editorId} delete returned ${response.status()}`)
      }
    }
    await prisma.auditLog.deleteMany({ where: { createdAt: { gte: startedAt } } })
    await prisma.$disconnect()
    expect(cleanupFailures).toEqual([])
  }
})
