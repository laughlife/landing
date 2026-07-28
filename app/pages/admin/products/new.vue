<script setup lang="ts">
import type { ProductFormValue } from '~/components/admin/catalog/ProductForm.vue'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: '新增产品 - 后台管理', robots: 'noindex, nofollow' })

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

const toast = useToast()
const router = useRouter()
const submitting = ref(false)
const categoryError = ref('')

const form = ref<ProductFormValue>({
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

const { data: categories, pending: categoriesPending, refresh: refreshCategories } = await useAsyncData('admin-product-create-categories', async () => {
  try {
    const response = await $fetch<ApiResponse<Category[] | { items: Category[] }>>('/api/admin/categories', {
      query: { pageSize: 100, sortBy: 'sortOrder', sortOrder: 'asc' }
    })
    categoryError.value = ''
    return Array.isArray(response.data) ? response.data : response.data.items
  } catch (error) {
    categoryError.value = getErrorMessage(error)
    return []
  }
})

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }, message?: string }
    return value.data?.message || value.message || '请求失败，请稍后重试'
  }
  return '请求失败，请稍后重试'
}

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
    const payload = {
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
      imageIds: form.value.images.map(image => Number(image.mediaId)),
      seoTitle: cleanOptional(form.value.seoTitle),
      seoKeywords: cleanOptional(form.value.seoKeywords),
      seoDescription: cleanOptional(form.value.seoDescription)
    }
    const response = await $fetch<ApiResponse<{ id: number | string }>>('/api/admin/products', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: '产品已创建', description: response.message, color: 'success' })
    await router.push(`/admin/products/${response.data.id}`)
  } catch (error) {
    toast.add({ title: '创建失败', description: getErrorMessage(error), color: 'error' })
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
          新增产品
        </h1>
      </div>
      <UButton
        to="/admin/products"
        icon="i-lucide-arrow-left"
        label="返回列表"
        color="neutral"
        variant="soft"
      />
    </div>

    <UAlert
      v-if="categoryError"
      title="分类加载失败"
      :description="categoryError"
      color="error"
      variant="soft"
    >
      <template #actions>
        <UButton
          label="重试"
          color="error"
          variant="soft"
          size="sm"
          @click="() => refreshCategories()"
        />
      </template>
    </UAlert>
    <div
      v-else-if="categoriesPending"
      class="space-y-4"
    >
      <USkeleton
        v-for="item in 3"
        :key="item"
        class="h-40 rounded-xl"
      />
    </div>
    <AdminCatalogProductForm
      v-else
      v-model="form"
      :categories="categories || []"
      :submitting="submitting"
      submit-label="创建产品"
      @submit="submit"
      @cancel="navigateTo('/admin/products')"
    />
  </div>
</template>
