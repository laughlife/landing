import { expect, test } from '@playwright/test'

test('官网品牌、主要路由和响应式布局可用', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/南阳市吴月商贸行/)
  await expect(page.getByRole('link', { name: '南阳市吴月商贸行首页' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('img[src="/wuyue.png"]').first()).toBeVisible()

  for (const route of ['/', '/products', '/services', '/about', '/partners', '/news', '/contact']) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    await expect(page.locator('main')).toBeVisible()

    if (testInfo.project.name === 'mobile-chromium') {
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(hasHorizontalOverflow, route).toBe(false)
    }
  }
})
