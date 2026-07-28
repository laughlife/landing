import { access } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { expect, test, type APIResponse, type Page, type Response } from '@playwright/test'

type ApiEnvelope<T> = { success: boolean, data: T, message: string, code?: string }
type H3ErrorEnvelope = { data?: ApiEnvelope<null> }
type UploadInputFile = { name: string, mimeType: string, buffer: Buffer }
type UploadedMedia = { id: number, url: string, originalName: string, mimeType: string }

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

async function uploadThroughInput(page: Page, testId: string, files: UploadInputFile[]) {
  const responses: Response[] = []
  const capture = (response: Response) => {
    if (response.url().endsWith('/api/upload') && response.request().method() === 'POST') {
      responses.push(response)
    }
  }
  page.on('response', capture)
  try {
    await page.getByTestId(testId).setInputFiles(files)
    await expect.poll(() => responses.length, { timeout: 30_000 }).toBe(files.length)
    const uploaded: UploadedMedia[] = []
    for (const response of responses) {
      expect(response.status()).toBe(200)
      uploaded.push((await response.json() as ApiEnvelope<UploadedMedia>).data)
    }
    return uploaded
  } finally {
    page.off('response', capture)
  }
}

test('后台权限、产品、上传与角色边界形成闭环', async ({ page }, testInfo) => {
  test.setTimeout(240_000)
  test.skip(testInfo.project.name !== 'chromium', '后台写入流程只在桌面 Chromium 执行一次')
  const clientErrors: string[] = []
  const consoleErrors: string[] = []
  const failedResponses: string[] = []
  page.on('pageerror', (error) => {
    clientErrors.push(error.message)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
  })

  const superUsername = process.env.ADMIN_INITIAL_USERNAME
  const superPassword = process.env.ADMIN_INITIAL_PASSWORD
  if (!superUsername || !superPassword) throw new Error('E2E requires seeded administrator credentials.')

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const editorUsername = `qa_editor_${runId.replaceAll('-', '_')}`
  const editorPassword = `Qa!${runId}SecurePassword`
  const productSlug = `qa-product-${runId}`
  const productName = `E2E 测试产品 ${runId}`
  let editorId: number | undefined
  let productId: number | undefined
  let copiedProductId: number | undefined
  const uploadedMedia: Array<UploadedMedia & { filePath: string, thumbnailPath: string }> = []
  const uploadRoot = resolve('storage/test-uploads')

  function rememberUploadedMedia(media: UploadedMedia) {
    const filePath = resolve(uploadRoot, media.url.replace(/^\/uploads\//, ''))
    if (!filePath.startsWith(`${uploadRoot}${sep}`)) throw new Error('Uploaded file escaped the isolated upload directory.')
    uploadedMedia.push({
      ...media,
      filePath,
      thumbnailPath: filePath.replace(new RegExp(`${extname(filePath)}$`), '-thumb.webp')
    })
  }

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
    const productResponseBody = await productResponse.json() as ApiEnvelope<{ id: number }>
    expect(productResponse.status(), JSON.stringify(productResponseBody)).toBe(200)
    productId = productResponseBody.data.id

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
    const editPageResponse = await page.goto(`/admin/products/${productId}`)
    expect(editPageResponse?.status()).toBe(200)
    await page.waitForLoadState('networkidle')

    const coverInput = page.getByTestId('product-cover-upload')
    await expect(coverInput).toHaveAttribute('aria-label', '上传封面图')
    expect(await coverInput.evaluate(input => (input as HTMLInputElement).multiple)).toBe(false)
    const [coverMedia] = await uploadThroughInput(page, 'product-cover-upload', [{
      name: `qa-cover-${runId}.png`,
      mimeType: 'image/png',
      buffer: png
    }])
    expect(coverMedia).toBeTruthy()
    rememberUploadedMedia(coverMedia!)
    await expect(page.getByAltText('产品封面预览')).toHaveAttribute('src', coverMedia!.url)

    const detailInput = page.getByTestId('product-detail-upload')
    await expect(detailInput).toHaveAttribute('aria-label', '上传详情图片')
    expect(await detailInput.evaluate(input => (input as HTMLInputElement).multiple)).toBe(true)
    const detailMedia = await uploadThroughInput(page, 'product-detail-upload', [
      { name: `qa-detail-a-${runId}.png`, mimeType: 'image/png', buffer: png },
      { name: `qa-detail-b-${runId}.png`, mimeType: 'image/png', buffer: png }
    ])
    expect(detailMedia).toHaveLength(2)
    detailMedia.forEach(rememberUploadedMedia)
    expect(new Set(detailMedia.map(media => media.id)).size).toBe(2)
    await expect(page.locator('input[placeholder="媒体库 ID"]')).toHaveCount(2)

    const saveResponsePromise = page.waitForResponse(response =>
      response.url().endsWith(`/api/admin/products/${productId}`)
      && response.request().method() === 'PATCH'
    )
    await page.getByRole('button', { name: '保存修改' }).click()
    expect((await saveResponsePromise).status()).toBe(200)

    const savedProductResponse = await page.request.get(`/api/admin/products/${productId}`)
    expect(savedProductResponse.status()).toBe(200)
    const savedProduct = await savedProductResponse.json() as ApiEnvelope<{
      coverImage: string
      images: Array<{ mediaId: number, imageUrl: string }>
    }>
    expect(savedProduct.data.coverImage).toBe(coverMedia!.url)
    expect(savedProduct.data.images.map(image => image.mediaId)).toEqual(detailMedia.map(media => media.id))
    expect(savedProduct.data.images.map(image => image.imageUrl)).toEqual(detailMedia.map(media => media.url))
    for (const media of uploadedMedia) {
      expect(media.mimeType).toBe('image/png')
      expect(media.url).toMatch(/^\/uploads\//)
      expect((await page.request.get(media.url)).status()).toBe(200)
      expect(await fileExists(media.filePath)).toBe(true)
      expect(await fileExists(media.thumbnailPath)).toBe(true)
    }

    await expectApiError(
      await page.request.delete(`/api/admin/media/${detailMedia[0]!.id}`, { headers: originHeaders }),
      409,
      'MEDIA_IN_USE'
    )

    failedResponses.length = 0
    const productsPageResponse = await page.goto('/admin/products')
    expect(productsPageResponse?.status()).toBe(200)
    await page.waitForLoadState('networkidle')
    expect(clientErrors).toEqual([])
    const sourceRow = page.getByRole('row').filter({ hasText: productName })
    await expect(sourceRow).toBeVisible().catch(() => {
      throw new Error(`产品列表未渲染。pageErrors=${JSON.stringify(clientErrors)} consoleErrors=${JSON.stringify(consoleErrors)} failedResponses=${JSON.stringify(failedResponses)}`)
    })
    const copyResponsePromise = page.waitForResponse(response =>
      response.url().endsWith(`/api/admin/product-actions/${productId}/copy`)
      && response.request().method() === 'POST'
    )
    await sourceRow.getByRole('button', { name: '复制产品' }).click()
    const copyResponse = await copyResponsePromise
    expect(copyResponse.status()).toBe(200)
    const copiedProduct = await copyResponse.json() as ApiEnvelope<{
      id: number
      slug: string
      status: string
      viewCount: number
      isFeatured: boolean
    }>
    copiedProductId = copiedProduct.data.id
    expect(copiedProduct.data).toMatchObject({ status: 'DRAFT', viewCount: 0, isFeatured: false })
    expect(copiedProduct.data.slug).not.toBe(productSlug)
    await expect(page).toHaveURL(`/admin/products/${copiedProductId}`)

    const copiedDetailResponse = await page.request.get(`/api/admin/products/${copiedProductId}`)
    expect(copiedDetailResponse.status()).toBe(200)
    const copiedDetail = await copiedDetailResponse.json() as ApiEnvelope<{ images: Array<{ mediaId: number }> }>
    expect(copiedDetail.data.images.map(image => image.mediaId)).toEqual(detailMedia.map(media => media.id))

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
    if (editorId || productId || copiedProductId || uploadedMedia.length) {
      await page.request.post('/api/auth/logout', { headers: originHeaders }).catch(() => undefined)
      const cleanupLogin = await page.request.post('/api/auth/login', {
        headers: originHeaders,
        data: { username: superUsername, password: superPassword }
      })
      if (cleanupLogin.status() !== 200) cleanupFailures.push(`cleanup login returned ${cleanupLogin.status()}`)
      if (productId) {
        if (copiedProductId) {
          const response = await page.request.delete(`/api/admin/products/${copiedProductId}`, { headers: originHeaders })
          if (response.status() !== 200) cleanupFailures.push(`copied product ${copiedProductId} delete returned ${response.status()}`)
        }
        const response = await page.request.delete(`/api/admin/products/${productId}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`product ${productId} delete returned ${response.status()}`)
      }
      for (const media of [...uploadedMedia].reverse()) {
        const response = await page.request.delete(`/api/admin/media/${media.id}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`media ${media.id} delete returned ${response.status()}`)
        if ((await page.request.get(media.url)).status() !== 404) cleanupFailures.push(`uploaded URL ${media.url} is still available`)
        if (await fileExists(media.filePath)) cleanupFailures.push(`uploaded file ${media.filePath} still exists`)
        if (await fileExists(media.thumbnailPath)) cleanupFailures.push(`thumbnail ${media.thumbnailPath} still exists`)
      }
      if (editorId) {
        const response = await page.request.delete(`/api/admin/users/${editorId}`, { headers: originHeaders })
        if (response.status() !== 200) cleanupFailures.push(`editor ${editorId} delete returned ${response.status()}`)
      }
    }
    expect(cleanupFailures).toEqual([])
  }
})
