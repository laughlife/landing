<script setup lang="ts">
type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED'

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface AdminPage<T> {
  items: T[]
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  pagination?: Pagination
}

interface ProductListItem {
  id: number | string
  name: string
  slug: string
  model?: string | null
  coverImage?: string | null
  categoryId: number | string
  category?: { id: number | string, name: string }
  status: ProductStatus
  isFeatured: boolean
  sortOrder: number
  viewCount?: number
  updatedAt?: string
}

interface Category {
  id: number | string
  name: string
  children?: Category[]
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: '产品列表 - 后台管理', robots: 'noindex, nofollow' })

const toast = useToast()
const page = ref(1)
const pageSize = ref(20)
const keywordInput = ref('')
const keyword = ref('')
const status = ref('')
const categoryId = ref(0)
const featured = ref('')
const sortBy = ref('updatedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const loadError = ref('')
const deleting = ref(false)
const deleteTarget = ref<ProductListItem | null>(null)
const deleteOpen = ref(false)

const statusItems = [
  { label: '全部状态', value: '' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已停用', value: 'DISABLED' }
]
const featuredItems = [
  { label: '全部推荐状态', value: '' },
  { label: '仅推荐', value: 'true' },
  { label: '仅未推荐', value: 'false' }
]
const sortItems = [
  { label: '最近更新', value: 'updatedAt' },
  { label: '创建时间', value: 'createdAt' },
  { label: '排序值', value: 'sortOrder' },
  { label: '浏览量', value: 'viewCount' }
]

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }, message?: string }
    return value.data?.message || value.message || '请求失败，请稍后重试'
  }
  return '请求失败，请稍后重试'
}

const { data: categories } = await useAsyncData('admin-product-list-categories', async () => {
  try {
    const response = await $fetch<ApiResponse<Category[] | { items: Category[] }>>('/api/admin/categories', {
      query: { pageSize: 100, sortBy: 'sortOrder', sortOrder: 'asc' }
    })
    return Array.isArray(response.data) ? response.data : response.data.items
  } catch {
    return []
  }
})

const categoryItems = computed(() => {
  const items: Array<{ label: string, value: number }> = [{ label: '全部分类', value: 0 }]
  const visit = (nodes: Category[], depth = 0) => {
    for (const node of nodes) {
      items.push({ label: `${'　'.repeat(depth)}${depth ? '└ ' : ''}${node.name}`, value: Number(node.id) })
      if (node.children?.length) visit(node.children, depth + 1)
    }
  }
  visit(categories.value || [])
  return items
})

const query = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  keyword: keyword.value || undefined,
  status: status.value || undefined,
  categoryId: categoryId.value || undefined,
  isFeatured: featured.value || undefined,
  sortBy: sortBy.value,
  sortOrder: sortOrder.value
}))

const { data: result, pending, refresh } = await useAsyncData('admin-products', async () => {
  try {
    const response = await $fetch<ApiResponse<AdminPage<ProductListItem>>>('/api/admin/products', {
      query: query.value
    })
    loadError.value = ''
    return response.data
  } catch (error) {
    loadError.value = getErrorMessage(error)
    return { items: [], pagination: { page: page.value, pageSize: pageSize.value, total: 0, totalPages: 0 } }
  }
}, { watch: [page, pageSize, status, categoryId, featured, sortBy, sortOrder, keyword] })

const products = computed(() => result.value?.items || [])
const pagination = computed(() => {
  if (!result.value) return { page: 1, pageSize: 20, total: 0, totalPages: 0 }
  return result.value.pagination || {
    page: result.value.page ?? page.value,
    pageSize: result.value.pageSize ?? pageSize.value,
    total: result.value.total ?? 0,
    totalPages: result.value.totalPages ?? 0
  }
})

const categoryNames = computed(() => {
  const names = new Map<string, string>()
  const visit = (nodes: Category[]) => {
    for (const node of nodes) {
      names.set(String(node.id), node.name)
      if (node.children?.length) visit(node.children)
    }
  }
  visit(categories.value || [])
  return names
})

function search() {
  page.value = 1
  keyword.value = keywordInput.value.trim()
}

function resetFilters() {
  keywordInput.value = ''
  keyword.value = ''
  status.value = ''
  categoryId.value = 0
  featured.value = ''
  sortBy.value = 'updatedAt'
  sortOrder.value = 'desc'
  page.value = 1
}

function askDelete(product: ProductListItem) {
  deleteTarget.value = product
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const response = await $fetch<ApiResponse<null>>(`/api/admin/products/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '产品已删除', description: response.message, color: 'success' })
    deleteOpen.value = false
    deleteTarget.value = null
    if (products.value.length === 1 && page.value > 1) page.value -= 1
    else await refresh()
  } catch (error) {
    toast.add({ title: '删除失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    deleting.value = false
  }
}

function statusLabel(value: ProductStatus) {
  return value === 'PUBLISHED' ? '已发布' : value === 'DISABLED' ? '已停用' : '草稿'
}

function statusColor(value: ProductStatus) {
  return value === 'PUBLISHED' ? 'success' : value === 'DISABLED' ? 'error' : 'neutral'
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm text-muted">
          产品管理
        </p>
        <h1 class="mt-1 text-2xl font-semibold text-highlighted">
          产品列表
        </h1>
        <p class="mt-1 text-sm text-muted">
          维护产品资料、发布状态和前台推荐。
        </p>
      </div>
      <UButton
        to="/admin/products/new"
        icon="i-lucide-plus"
        label="新增产品"
      />
    </div>

    <UCard>
      <form
        class="grid gap-3 lg:grid-cols-[minmax(14rem,2fr)_repeat(4,minmax(8rem,1fr))_auto]"
        @submit.prevent="search"
      >
        <UInput
          v-model="keywordInput"
          icon="i-lucide-search"
          placeholder="搜索产品名称、型号或 URL 标识"
        />
        <USelect
          v-model="categoryId"
          :items="categoryItems"
        />
        <USelect
          v-model="status"
          :items="statusItems"
        />
        <USelect
          v-model="featured"
          :items="featuredItems"
        />
        <USelect
          v-model="sortBy"
          :items="sortItems"
        />
        <div class="flex gap-2">
          <UButton
            type="submit"
            label="查询"
            class="flex-1"
          />
          <UButton
            type="button"
            icon="i-lucide-rotate-ccw"
            aria-label="重置筛选"
            color="neutral"
            variant="soft"
            @click="resetFilters"
          />
        </div>
      </form>
    </UCard>

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

    <UCard
      v-else
      class="overflow-hidden"
    >
      <div
        v-if="pending"
        class="space-y-3 p-1"
      >
        <USkeleton
          v-for="item in 6"
          :key="item"
          class="h-16 rounded-lg"
        />
      </div>
      <div
        v-else-if="products.length"
        class="-mx-6 -my-6 overflow-x-auto"
      >
        <table class="min-w-full divide-y divide-default text-sm">
          <thead class="bg-muted/40 text-left text-xs font-medium tracking-wide text-muted uppercase">
            <tr>
              <th class="px-5 py-3">
                产品
              </th>
              <th class="px-5 py-3">
                分类
              </th>
              <th class="px-5 py-3">
                状态
              </th>
              <th class="px-5 py-3">
                推荐 / 排序
              </th>
              <th class="px-5 py-3">
                浏览量
              </th>
              <th class="px-5 py-3">
                更新时间
              </th>
              <th class="px-5 py-3 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="product in products"
              :key="product.id"
              class="hover:bg-muted/20"
            >
              <td class="px-5 py-4">
                <div class="flex min-w-64 items-center gap-3">
                  <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
                    <img
                      v-if="product.coverImage"
                      :src="product.coverImage"
                      :alt="product.name"
                      class="h-full w-full object-cover"
                    >
                    <UIcon
                      v-else
                      name="i-lucide-package"
                      class="size-5 text-dimmed"
                    />
                  </div>
                  <div>
                    <NuxtLink
                      :to="`/admin/products/${product.id}`"
                      class="font-medium text-highlighted hover:text-primary"
                    >{{ product.name }}</NuxtLink>
                    <p class="mt-1 text-xs text-muted">
                      {{ product.model || product.slug }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">
                {{ product.category?.name || categoryNames.get(String(product.categoryId)) || '未分类' }}
              </td>
              <td class="px-5 py-4">
                <UBadge
                  :color="statusColor(product.status)"
                  variant="soft"
                >
                  {{ statusLabel(product.status) }}
                </UBadge>
              </td>
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <UIcon
                    v-if="product.isFeatured"
                    name="i-lucide-star"
                    class="size-4 text-warning"
                  />
                  <span class="text-muted">{{ product.isFeatured ? '推荐' : '普通' }} · {{ product.sortOrder }}</span>
                </div>
              </td>
              <td class="px-5 py-4 text-muted">
                {{ product.viewCount ?? 0 }}
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-muted">
                {{ formatDate(product.updatedAt) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-1">
                  <UButton
                    :to="`/admin/products/${product.id}`"
                    icon="i-lucide-pencil"
                    aria-label="编辑产品"
                    color="neutral"
                    variant="ghost"
                  />
                  <UButton
                    v-if="product.status === 'PUBLISHED'"
                    :to="`/products/${product.slug}`"
                    target="_blank"
                    icon="i-lucide-external-link"
                    aria-label="前台预览"
                    color="neutral"
                    variant="ghost"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="删除产品"
                    color="error"
                    variant="ghost"
                    @click="askDelete(product)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-else
        class="py-14 text-center"
      >
        <UIcon
          name="i-lucide-package-search"
          class="mx-auto size-10 text-dimmed"
        />
        <h2 class="mt-3 font-medium text-highlighted">
          没有符合条件的产品
        </h2>
        <p class="mt-1 text-sm text-muted">
          调整筛选条件，或创建第一个产品。
        </p>
        <UButton
          to="/admin/products/new"
          label="新增产品"
          icon="i-lucide-plus"
          class="mt-4"
        />
      </div>
    </UCard>

    <div
      v-if="pagination.total > 0"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <p class="text-sm text-muted">
        共 {{ pagination.total }} 条，第 {{ pagination.page }} / {{ Math.max(pagination.totalPages, 1) }} 页
      </p>
      <UPagination
        v-model:page="page"
        :total="pagination.total"
        :items-per-page="pageSize"
      />
    </div>

    <UModal
      v-model:open="deleteOpen"
      title="确认删除产品"
      description="删除后无法恢复，请确认该产品不再需要。"
    >
      <template #body>
        <p class="text-sm text-muted">
          即将删除“<span class="font-medium text-highlighted">{{ deleteTarget?.name }}</span>”。相关详情图片记录也会一并移除，但媒体库原文件仍受引用检查保护。
        </p>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="ghost"
            :disabled="deleting"
            @click="deleteOpen = false"
          />
          <UButton
            label="确认删除"
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
