import { describe, expect, it } from 'vitest'
import { productSchema } from '../../server/validators/content'

describe('product image validator contract', () => {
  const validProduct = {
    categoryId: 1,
    name: '测试产品',
    slug: 'test-product'
  }

  it('keeps media identifiers and alt text but ignores client-provided image URLs', () => {
    const parsed = productSchema.parse({
      ...validProduct,
      images: [{
        mediaId: 12,
        altText: ' 产品侧面 ',
        imageUrl: 'https://untrusted.example/image.png'
      }]
    })

    expect(parsed.images).toEqual([{ mediaId: 12, altText: '产品侧面' }])
  })

  it('rejects duplicate media identifiers and oversized alt text', () => {
    expect(productSchema.safeParse({
      ...validProduct,
      images: [{ mediaId: 12 }, { mediaId: 12 }]
    }).success).toBe(false)

    expect(productSchema.safeParse({
      ...validProduct,
      images: [{ mediaId: 12, altText: '图'.repeat(256) }]
    }).success).toBe(false)
  })
})
