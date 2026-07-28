import { afterAll, describe, expect, it } from 'vitest'
import { prisma } from '../../server/utils/db'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('isolated MySQL portal contract', () => {
  it('has the seeded singleton data and published public content', async () => {
    const [company, settings, publishedProducts, hiddenProducts] = await Promise.all([
      prisma.companyProfile.findUnique({ where: { id: 1 } }),
      prisma.siteSetting.findUnique({ where: { id: 1 } }),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      prisma.product.count({ where: { status: { not: 'PUBLISHED' } } })
    ])

    expect(company?.companyName).toContain('南阳市吴月商贸行')
    expect(settings?.siteName).toContain('南阳市吴月商贸行')
    expect(publishedProducts).toBeGreaterThan(0)
    expect(hiddenProducts).toBeGreaterThanOrEqual(0)
  })

  it('rolls back a failed transaction without leaving test fixtures', async () => {
    const slug = `qa-rollback-${Date.now()}`

    await expect(prisma.$transaction(async (transaction) => {
      await transaction.productCategory.create({
        data: { name: '事务回滚夹具', slug, status: 'ENABLED' }
      })
      throw new Error('intentional rollback')
    })).rejects.toThrow('intentional rollback')

    expect(await prisma.productCategory.count({ where: { slug } })).toBe(0)
  })
})
