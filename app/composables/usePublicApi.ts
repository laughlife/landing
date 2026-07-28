export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
  code?: string
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  items: T[]
  pagination: PaginationMeta
}

export interface SiteInfo {
  siteName: string
  siteUrl?: string
  siteTitle?: string
  siteKeywords?: string
  siteDescription?: string
  logo?: string
  favicon?: string
  footerText?: string
  copyright?: string
  icpNumber?: string
  contactConfig?: ContactInfo
}

export interface ContactInfo {
  address?: string
  phone?: string
  email?: string
  wechat?: string
  whatsapp?: string
  workingHours?: string
  latitude?: number
  longitude?: number
}

export interface CompanyProfile extends ContactInfo {
  companyName: string
  shortName?: string
  slogan?: string
  logo?: string
  favicon?: string
  heroTitle?: string
  heroSubtitle?: string
  introduction?: string
  fullDescription?: string
  businessScope?: string
  advantages?: string[]
  registrationInfo?: string
}

export interface Banner {
  id: string
  title: string
  subtitle?: string
  image?: string
  mobileImage?: string
  buttonText?: string
  buttonLink?: string
}

export interface Category {
  id: string
  name: string
  slug: string
  summary?: string
  description?: string
  coverImage?: string
  icon?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  children?: Category[]
}

export interface ProductImage {
  id: string
  imageUrl: string
  altText?: string
}

export interface Product {
  id: string
  name: string
  slug: string
  model?: string
  subtitle?: string
  summary?: string
  description?: string
  coverImage?: string
  features?: string[]
  applications?: string[]
  specifications?: Array<{ group: string, items: Array<{ label: string, value: string }> }>
  category?: Pick<Category, 'id' | 'name' | 'slug'>
  images?: ProductImage[]
  relatedProducts?: Product[]
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  publishedAt?: string
}

export interface ServiceItem {
  id: string
  name: string
  slug: string
  icon?: string
  coverImage?: string
  summary?: string
  description?: string
  features?: string[]
  processSteps?: Array<{ title: string, description?: string }>
  seoTitle?: string
  seoDescription?: string
}

export interface Partner {
  id: string
  name: string
  slug: string
  logo?: string
  coverImage?: string
  summary?: string
  description?: string
  website?: string
  cooperationType?: string
  seoTitle?: string
  seoDescription?: string
}

export interface Article {
  id: string
  title: string
  slug: string
  summary?: string
  content?: string
  coverImage?: string
  author?: string
  publishedAt?: string
  seoTitle?: string
  seoKeywords?: string
  seoDescription?: string
  relatedArticles?: Article[]
}

export interface HomeData {
  site?: SiteInfo
  company?: CompanyProfile
  banners?: Banner[]
  services?: ServiceItem[]
  categories?: Category[]
  products?: Product[]
  partners?: Partner[]
  articles?: Article[]
  featuredProducts?: Product[]
  featuredPartners?: Partner[]
  latestArticles?: Article[]
}

export interface ContactPayload {
  name: string
  company?: string
  phone: string
  email?: string
  subject?: string
  message: string
  sourcePage: string
  productId?: string
  website?: string
}

export function usePublicSiteOrigin() {
  const config = useRuntimeConfig()
  const requestUrl = useRequestURL()
  return computed(() => {
    const configured = String(config.public.siteUrl || '').trim()
    return (configured || requestUrl.origin).replace(/\/+$/, '')
  })
}

export function publicImageVariant(url: string | undefined, variant: 'thumb' | 480 | 960 | 1600): string | undefined {
  if (!url || !url.startsWith('/uploads/') || !/\.(?:jpe?g|png|webp)$/i.test(url)) return url
  return url.replace(/\.[^.]+$/, `-${variant}.webp`)
}

export function usePublicApi() {
  async function request<T>(path: string, options?: Parameters<typeof $fetch>[1]) {
    const response = await $fetch<ApiResponse<T>>(path, options)
    if (!response.success) {
      throw createError({ statusCode: 500, statusMessage: response.message || '请求失败' })
    }
    return response.data
  }

  return { request }
}
