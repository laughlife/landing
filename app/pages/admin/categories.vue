<script setup lang="ts">
type CategoryStatus = 'ENABLED' | 'DISABLED'

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

interface Category {
  id: number | string
  parentId?: number | string | null
  name: string
  slug: string
  summary?: string | null
  description?: string | null
  coverImage?: string | null
  icon?: string | null
  sortOrder: number
  status: CategoryStatus
  seoTitle?: string | null
  seoKeywords?: string | null
  seoDescription?: string | null
  children?: Category[]
  _count?: { products?: number, children?: number }
  productCount?: number
  updatedAt?: string
}

interface CategoryRow extends Category {
  depth: number
}

interface CategoryForm {
  id: number | string | null
  parentId: number
  name: string
  slug: string
  summary: string
  description: string
  coverImage: string
  icon: string
  sortOrder: number
  status: CategoryStatus
  seoTitle: string
  seoKeywords: string
  seoDescription: string
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: '产品分类 - 后台管理', robots: 'noindex, nofollow' })

const toast = useToast()
const route = useRoute()
const loadError = ref('')
const editorOpen = ref(false)
const deleteOpen = ref(false)
const submitting = ref(false)
const deleting = ref(false)
const deleteTarget = ref<Category | null>(null)
const openedRouteEditId = ref<number | null>(null)

const blankForm = (): CategoryForm => ({
  id: null,
  parentId: 0,
  name: '',
  slug: '',
  summary: '',
  description: '',
  coverImage: '',
  icon: '',
  sortOrder: 0,
  status: 'ENABLED',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: ''
})
const form = ref<CategoryForm>(blankForm())

const statusItems = [
  { label: '启用', value: 'ENABLED' },
  { label: '停用', value: 'DISABLED' }
]

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }, message?: string }
    return value.data?.message || value.message || '请求失败，请稍后重试'
  }
  return '请求失败，请稍后重试'
}

const { data: categories, pending, refresh } = await useAsyncData('admin-categories', async () => {
  try {
    const response = await $fetch<ApiResponse<Category[] | { items: Category[] }>>('/api/admin/categories', {
      query: { pageSize: 100, sortBy: 'sortOrder', sortOrder: 'asc' }
    })
    loadError.value = ''
    const items = Array.isArray(response.data) ? response.data : response.data.items
    if (items.some(item => item.children?.length)) return items

    const byId = new Map(items.map(item => [String(item.id), { ...item, children: [] as Category[] }]))
    const roots: Category[] = []
    for (const item of byId.values()) {
      const parent = item.parentId ? byId.get(String(item.parentId)) : undefined
      if (parent) parent.children?.push(item)
      else roots.push(item)
    }
    return roots
  } catch (error) {
    loadError.value = getErrorMessage(error)
    return []
  }
})

const rows = computed<CategoryRow[]>(() => {
  const output: CategoryRow[] = []
  const visit = (nodes: Category[], depth = 0) => {
    for (const node of nodes) {
      output.push({ ...node, depth })
      if (node.children?.length) visit(node.children, depth + 1)
    }
  }
  visit(categories.value || [])
  return output
})

const parentItems = computed(() => [
  { label: '无（一级分类）', value: 0 },
  ...rows.value
    .filter(row => row.depth === 0 && String(row.id) !== String(form.value.id))
    .map(row => ({ label: row.name, value: Number(row.id) }))
])

function openCreate(parent?: Category) {
  form.value = { ...blankForm(), parentId: parent ? Number(parent.id) : 0 }
  editorOpen.value = true
}

function openEdit(category: Category) {
  form.value = {
    id: category.id,
    parentId: Number(category.parentId || 0),
    name: category.name,
    slug: category.slug,
    summary: category.summary || '',
    description: category.description || '',
    coverImage: category.coverImage || '',
    icon: category.icon || '',
    sortOrder: category.sortOrder,
    status: category.status,
    seoTitle: category.seoTitle || '',
    seoKeywords: category.seoKeywords || '',
    seoDescription: category.seoDescription || ''
  }
  editorOpen.value = true
}

async function openRouteEdit() {
  const rawId = Array.isArray(route.query.edit) ? route.query.edit[0] : route.query.edit
  const id = Number(rawId)
  if (!Number.isSafeInteger(id) || id < 1 || openedRouteEditId.value === id)
    return
  try {
    const response = await $fetch<ApiResponse<Category>>(`/api/admin/categories/${id}`)
    openedRouteEditId.value = id
    openEdit(response.data)
  } catch (error) {
    toast.add({ title: '无法打开指定分类', description: getErrorMessage(error), color: 'error' })
  }
}

function cleanOptional(value: string) {
  return value.trim() || null
}

watch(() => route.query.edit, () => void openRouteEdit())
onMounted(() => void openRouteEdit())

async function saveCategory() {
  if (!form.value.name.trim()) {
    toast.add({ title: '无法保存', description: '请填写分类名称', color: 'error' })
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.value.slug)) {
    toast.add({ title: '无法保存', description: 'URL 标识只能包含小写字母、数字和连字符', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      slug: form.value.slug,
      parentId: form.value.parentId || null,
      summary: cleanOptional(form.value.summary),
      description: cleanOptional(form.value.description),
      coverImage: cleanOptional(form.value.coverImage),
      icon: cleanOptional(form.value.icon),
      sortOrder: form.value.sortOrder,
      status: form.value.status,
      seoTitle: cleanOptional(form.value.seoTitle),
      seoKeywords: cleanOptional(form.value.seoKeywords),
      seoDescription: cleanOptional(form.value.seoDescription)
    }
    const url = form.value.id ? `/api/admin/categories/${form.value.id}` : '/api/admin/categories'
    const response = await $fetch<ApiResponse<Category>>(url, {
      method: form.value.id ? 'PATCH' : 'POST',
      body: payload
    })
    toast.add({ title: form.value.id ? '分类已保存' : '分类已创建', description: response.message, color: 'success' })
    editorOpen.value = false
    await refresh()
  } catch (error) {
    toast.add({ title: '保存失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    submitting.value = false
  }
}

function askDelete(category: Category) {
  deleteTarget.value = category
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const response = await $fetch<ApiResponse<null>>(`/api/admin/categories/${deleteTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: '分类已删除', description: response.message, color: 'success' })
    deleteOpen.value = false
    deleteTarget.value = null
    await refresh()
  } catch (error) {
    toast.add({ title: '删除失败', description: getErrorMessage(error), color: 'error' })
  } finally {
    deleting.value = false
  }
}

function productCount(category: Category) {
  return category._count?.products ?? category.productCount ?? 0
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
          产品分类
        </h1>
        <p class="mt-1 text-sm text-muted">
          支持两级分类、排序、启停和 SEO 信息维护。
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="新增分类"
        @click="openCreate()"
      />
    </div>

    <UAlert
      v-if="loadError"
      title="分类加载失败"
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
        class="space-y-3"
      >
        <USkeleton
          v-for="item in 5"
          :key="item"
          class="h-14 rounded-lg"
        />
      </div>
      <div
        v-else-if="rows.length"
        class="-mx-6 -my-6 overflow-x-auto"
      >
        <table class="min-w-full divide-y divide-default text-sm">
          <thead class="bg-muted/40 text-left text-xs font-medium tracking-wide text-muted uppercase">
            <tr>
              <th class="px-5 py-3">
                分类名称
              </th>
              <th class="px-5 py-3">
                URL 标识
              </th>
              <th class="px-5 py-3">
                状态
              </th>
              <th class="px-5 py-3">
                排序
              </th>
              <th class="px-5 py-3">
                产品数
              </th>
              <th class="px-5 py-3 text-right">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="category in rows"
              :key="category.id"
              class="hover:bg-muted/20"
            >
              <td class="px-5 py-4">
                <div
                  class="flex items-center gap-3"
                  :style="{ paddingLeft: `${category.depth * 28}px` }"
                >
                  <span
                    v-if="category.depth"
                    class="text-dimmed"
                  >└</span>
                  <div class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
                    <img
                      v-if="category.coverImage"
                      :src="category.coverImage"
                      :alt="category.name"
                      class="h-full w-full object-cover"
                    >
                    <UIcon
                      v-else
                      :name="category.icon || 'i-lucide-folder'"
                      class="size-5 text-dimmed"
                    />
                  </div>
                  <div>
                    <p class="font-medium text-highlighted">
                      {{ category.name }}
                    </p>
                    <p
                      v-if="category.summary"
                      class="mt-1 max-w-md truncate text-xs text-muted"
                    >
                      {{ category.summary }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-5 py-4 font-mono text-xs text-muted">
                {{ category.slug }}
              </td>
              <td class="px-5 py-4">
                <UBadge
                  :color="category.status === 'ENABLED' ? 'success' : 'neutral'"
                  variant="soft"
                >
                  {{ category.status === 'ENABLED' ? '启用' : '停用' }}
                </UBadge>
              </td>
              <td class="px-5 py-4 text-muted">
                {{ category.sortOrder }}
              </td>
              <td class="px-5 py-4 text-muted">
                {{ productCount(category) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex justify-end gap-1">
                  <UButton
                    v-if="category.depth === 0"
                    icon="i-lucide-folder-plus"
                    aria-label="新增子分类"
                    color="neutral"
                    variant="ghost"
                    @click="openCreate(category)"
                  />
                  <UButton
                    icon="i-lucide-pencil"
                    aria-label="编辑分类"
                    color="neutral"
                    variant="ghost"
                    @click="openEdit(category)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="删除分类"
                    color="error"
                    variant="ghost"
                    @click="askDelete(category)"
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
          name="i-lucide-folders"
          class="mx-auto size-10 text-dimmed"
        />
        <h2 class="mt-3 font-medium text-highlighted">
          暂无产品分类
        </h2>
        <p class="mt-1 text-sm text-muted">
          先创建一级分类，再按需添加二级分类。
        </p>
        <UButton
          label="新增分类"
          icon="i-lucide-plus"
          class="mt-4"
          @click="openCreate()"
        />
      </div>
    </UCard>

    <UModal
      v-model:open="editorOpen"
      :title="form.id ? '编辑产品分类' : '新增产品分类'"
      description="分类最多支持一级和二级，URL 标识保存后应谨慎修改。"
    >
      <template #body>
        <form
          id="category-form"
          class="space-y-5"
          @submit.prevent="saveCategory"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              label="分类名称"
              required
            >
              <UInput
                v-model="form.name"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="URL 标识"
              required
            >
              <UInput
                v-model="form.slug"
                class="w-full"
                placeholder="category-slug"
              />
            </UFormField>
            <UFormField label="上级分类">
              <USelect
                v-model="form.parentId"
                :items="parentItems"
                class="w-full"
              />
            </UFormField>
            <UFormField label="状态">
              <USelect
                v-model="form.status"
                :items="statusItems"
                class="w-full"
              />
            </UFormField>
            <UFormField label="排序值">
              <UInput
                v-model.number="form.sortOrder"
                type="number"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Iconify 图标">
              <UInput
                v-model="form.icon"
                class="w-full"
                placeholder="i-lucide-package"
              />
            </UFormField>
            <UFormField
              label="分类封面图"
              class="sm:col-span-2"
            >
              <AdminMediaPicker
                v-model="form.coverImage"
                button-label="选择分类封面"
              />
            </UFormField>
            <UFormField
              label="分类摘要"
              class="sm:col-span-2"
            >
              <UTextarea
                v-model="form.summary"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="分类介绍"
              class="sm:col-span-2"
            >
              <UTextarea
                v-model="form.description"
                :rows="5"
                class="w-full font-mono text-sm"
                placeholder="<p>分类介绍...</p>"
              />
            </UFormField>
          </div>

          <div class="border-t border-default pt-5">
            <h3 class="text-sm font-semibold text-highlighted">
              SEO 设置
            </h3>
            <div class="mt-3 space-y-4">
              <UFormField label="SEO 标题">
                <UInput
                  v-model="form.seoTitle"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="SEO 关键词">
                <UInput
                  v-model="form.seoKeywords"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="SEO 描述">
                <UTextarea
                  v-model="form.seoDescription"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            label="取消"
            color="neutral"
            variant="ghost"
            :disabled="submitting"
            @click="editorOpen = false"
          />
          <UButton
            type="submit"
            form="category-form"
            :label="form.id ? '保存修改' : '创建分类'"
            :loading="submitting"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteOpen"
      title="确认删除分类"
      description="只有不含子分类且未关联产品的分类才允许删除。"
    >
      <template #body>
        <p class="text-sm text-muted">
          即将删除“<span class="font-medium text-highlighted">{{ deleteTarget?.name }}</span>”。系统会在服务端再次执行关联数据安全检查。
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
