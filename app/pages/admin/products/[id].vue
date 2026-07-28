<script setup lang="ts">
import type { ProductFormValue } from '~/components/admin/catalog/ProductForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: '编辑产品 - 后台管理', robots: 'noindex, nofollow' })

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

interface Category {
  id: number | string
  name: string
  parentId?: number | string | null
  children?: Category[]
}

interface ProductData extends Omit<Partial<ProductFormValue>, 'images'> {
  id: number | string
  categoryId?: number
  category?: { id: number | string }
  images?: Array<{ mediaId?: number, media?: { id?: number }, imageUrl?: string, altText?: string }>
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const submitting = ref(false)
const loadError = ref('')

const emptyForm = (): ProductFormValue => ({
  categoryId: undefined,
  name: '',
  slug: '',
  model: '',
  subtitle: '',
  summary: '',
  description: '',
  coverImage: '',
  videoUrl: '',
  features: [],
  applications: [],
  specifications: [],
  images: [],
  sortOrder: 0,
  isFeatured: false,
  status: 'DRAFT',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: ''
})

const form = ref<ProductFormValue>(emptyForm())

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }, message?: string }
    return value.data?.message || value.message || '请求失败，请稍后重试'
  }
  return '请求失败，请稍后重试'
}

const { data: pageData, pending, refresh } = await useAsyncData(`admin-product-${route.params.id}`, async () => {
  try {
    const [productResponse, categoryResponse] = await Promise.all([
      $fetch<ApiResponse<ProductData>>(`/api/admin/products/${route.params.id}`),
      $fetch<ApiResponse<Category[] | { items: Category[] }>>('/api/admin/categories', {
        query: { pageSize: 100, sortBy: 'sortOrder', sortOrder: 'asc' }
      })
    ])
    loadError.value = ''
    return {
      product: productResponse.data,
      categories: Array.isArray(categoryResponse.data) ? categoryResponse.data : categoryResponse.data.items
    }
  } catch (error) {
    loadError.value = getErrorMessage(error)
    return null
  }
})

watch(pageData, (value) => {
  if (!value?.product) return
  const product = value.product
  form.value = {
    ...emptyForm(),
    ...product,
    categoryId: Number(product.categoryId ?? product.category?.id ?? 0) || undefined,
    features: Array.isArray(product.features) ? [...product.features] : [],
    applications: Array.isArray(product.applications) ? [...product.applications] : [],
    specifications: Array.isArray(product.specifications)
      ? product.specifications.map(group => ({
          group: group.group,
          items: group.items.map(item => ({ ...item }))
        }))
      : [],
    images: Array.isArray(product.images)
      ? product.images.map(image => ({
          mediaId: Number(image.mediaId ?? image.media?.id ?? 0) || undefined,
          imageUrl: image.imageUrl || '',
          altText: image.altText || ''
        }))
      : []
  }
}, { immediate: true })

function cleanOptional(value: string) {
  return value.trim() || null
}

function validate() {
  if (!form.value.name.trim()) return '请填写产品名称'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.value.slug)) return 'URL 标识只能包含小写字母、数字和连字符'
  if (!form.value.categoryId) return '请选择所属分类'
  if (form.value.specifications.some(group => !group.group.trim() || !group.items.length || group.items.some(item => !item.label.trim() || !item.value.trim()))) {
    return '请完整填写规格分组及参数'
  }
  if (form.value.images.some(image => !image.mediaId)) return '详情图片必须填写有效的媒体 ID'
  return ''
}

async function submit() {
  const validationMessage = validate()
  if (validationMessage) {
    toast.add({ title: '无法保存', description: validationMessage, color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload: Record<string, unknown> = {
      ...form.value,
      categoryId: Number(form.value.categoryId),
      model: cleanOptional(form.value.model),
      subtitle: cleanOptional(form.value.subtitle),
      summary: cleanOptional(form.value.summary),
      description: cleanOptional(form.value.description),
      coverImage: cleanOptional(form.value.coverImage),
      videoUrl: cleanOptional(form.value.videoUrl),
      features: form.value.features.map(item => item.trim()).filter(Boolean),
      applications: form.value.applications.map(item => item.trim()).filter(Boolean),
      specifications: form.value.specifications,
      images: form.value.images.map(image => ({
        mediaId: Number(image.mediaId),
        altText: cleanOptional(image.altText)
      })),
      seoTitle: cleanOptional(form.value.seoTitle),
      seoKeywords: cleanOptional(form.value.seoKeywords),
      seoDescription: cleanOptional(form.value.seoDescription)
    }
    const response = await $fetch<ApiResponse<ProductData>>(`/api/admin/products/${route.params.id}`, {
      method: 'PATCH',
      body: payload
    })
    toast.add({ title: '产品已保存', description: response.message, color: 'success' })
    await refresh()
  } catch (error) {
    toast.add({ title: '保存失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm text-muted">
          产品管理 / 产品列表
        </p>
        <h1 class="mt-1 text-2xl font-semibold text-highlighted">
          编辑产品
        </h1>
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="pageData?.product?.slug && pageData.product.status === 'PUBLISHED'"
          :to="`/products/${pageData.product.slug}`"
          target="_blank"
          icon="i-lucide-external-link"
          label="前台预览"
          color="neutral"
          variant="soft"
        />
        <UButton
          to="/admin/products"
          icon="i-lucide-arrow-left"
          label="返回列表"
          color="neutral"
          variant="soft"
        />
      </div>
    </div>

    <UAlert
      v-if="loadError"
      title="产品加载失败"
      :description="loadError"
      color="error"
      variant="soft"
    >
      <template #actions>
        <UButton
          label="重试"
          color="error"
          variant="soft"
          size="sm"
          @click="() => refresh()"
        />
      </template>
    </UAlert>
    <div
      v-else-if="pending"
      class="space-y-4"
    >
      <USkeleton
        v-for="item in 4"
        :key="item"
        class="h-40 rounded-xl"
      />
    </div>
    <AdminCatalogProductForm
      v-else-if="pageData"
      v-model="form"
      :categories="pageData.categories"
      :submitting="submitting"
      submit-label="保存修改"
      @submit="submit"
      @cancel="router.push('/admin/products')"
    />
    <UCard v-else>
      <div class="py-10 text-center">
        <UIcon
          name="i-lucide-package-x"
          class="mx-auto size-10 text-dimmed"
        />
        <p class="mt-3 text-sm text-muted">
          未找到该产品。
        </p>
      </div>
    </UCard>
  </div>
</template>
