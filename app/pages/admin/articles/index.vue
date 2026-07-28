<script setup lang="ts">
interface ArticleRow {
  id: number
  title: string
  slug: string
  author?: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED'
  isFeatured: boolean
  publishedAt?: string | null
  updatedAt: string
}

interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

interface ArticleListPayload {
  items: ArticleRow[]
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  pagination?: PageMeta
  meta?: PageMeta
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ robots: 'noindex, nofollow' })

const toast = useToast()
const articles = ref<ArticleRow[]>([])
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const status = ref('ALL')
const page = ref(1)
const pageSize = 10
const meta = ref<PageMeta>({ page: 1, pageSize, total: 0, totalPages: 0 })
const deleteOpen = ref(false)
const deleting = ref(false)
const selectedArticle = ref<ArticleRow | null>(null)
const statusOptions = [
  { label: '全部状态', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已停用', value: 'DISABLED' }
]

function statusLabel(statusValue: ArticleRow['status']) {
  return { DRAFT: '草稿', PUBLISHED: '已发布', DISABLED: '已停用' }[statusValue]
}

function statusColor(statusValue: ArticleRow['status']) {
  return statusValue === 'PUBLISHED' ? 'success' : statusValue === 'DRAFT' ? 'warning' : 'neutral'
}

function formatDate(value?: string | null) {
  if (!value)
    return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

async function loadArticles() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<ApiEnvelope<ArticleListPayload>>('/api/admin/articles', {
      query: {
        page: page.value,
        pageSize,
        keyword: keyword.value || undefined,
        status: status.value === 'ALL' ? undefined : status.value,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      }
    })
    articles.value = response.data.items
    meta.value = response.data.pagination ?? response.data.meta ?? {
      page: response.data.page ?? page.value,
      pageSize: response.data.pageSize ?? pageSize,
      total: response.data.total ?? response.data.items.length,
      totalPages: response.data.totalPages ?? (response.data.items.length < pageSize ? page.value : page.value + 1)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '文章列表加载失败'
  } finally {
    loading.value = false
  }
}

function requestDelete(article: ArticleRow) {
  selectedArticle.value = article
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!selectedArticle.value)
    return
  deleting.value = true
  try {
    await $fetch(`/api/admin/articles/${selectedArticle.value.id}`, { method: 'DELETE' })
    deleteOpen.value = false
    toast.add({ title: '文章已删除', color: 'success' })
    if (articles.value.length === 1 && page.value > 1)
      page.value--
    await loadArticles()
  } catch (error) {
    toast.add({
      title: '删除失败',
      description: error instanceof Error ? error.message : '请稍后重试',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

watch([keyword, status], () => {
  page.value = 1
  void loadArticles()
})
watch(page, () => void loadArticles())
onMounted(() => void loadArticles())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          新闻资讯
        </h1>
        <p class="mt-1 text-sm text-muted">
          创建、发布和维护公司动态与行业资讯。
        </p>
      </div>
      <UButton
        to="/admin/articles/new"
        icon="i-lucide-plus"
        class="justify-center"
      >
        新建文章
      </UButton>
    </div>

    <UCard>
      <div class="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <UInput
          v-model="keyword"
          icon="i-lucide-search"
          placeholder="搜索标题或 Slug"
        />
        <USelect
          v-model="status"
          :items="statusOptions"
        />
      </div>

      <div
        v-if="loading"
        class="space-y-3 py-4"
      >
        <USkeleton
          v-for="index in 5"
          :key="index"
          class="h-14 w-full"
        />
      </div>
      <UAlert
        v-else-if="loadError"
        color="error"
        variant="subtle"
        title="文章加载失败"
        :description="loadError"
        :actions="[{ label: '重新加载', onClick: loadArticles }]"
      />
      <div
        v-else-if="articles.length === 0"
        class="flex flex-col items-center py-14 text-center"
      >
        <UIcon
          name="i-lucide-newspaper"
          class="size-10 text-dimmed"
        />
        <p class="mt-3 font-medium text-highlighted">
          暂无文章
        </p>
        <p class="mt-1 text-sm text-muted">
          调整筛选条件，或发布第一篇公司资讯。
        </p>
        <UButton
          to="/admin/articles/new"
          class="mt-4"
          variant="soft"
          icon="i-lucide-plus"
        >
          新建文章
        </UButton>
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full min-w-4xl text-left text-sm">
          <thead class="border-b border-default text-xs text-muted">
            <tr>
              <th class="px-3 py-3 font-medium">
                标题
              </th>
              <th class="px-3 py-3 font-medium">
                作者
              </th>
              <th class="px-3 py-3 font-medium">
                状态
              </th>
              <th class="px-3 py-3 font-medium">
                发布时间
              </th>
              <th class="px-3 py-3 font-medium">
                更新时间
              </th>
              <th class="px-3 py-3 text-right font-medium">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="article in articles"
              :key="article.id"
              class="hover:bg-elevated/40"
            >
              <td class="max-w-80 px-3 py-4">
                <div class="flex items-center gap-2">
                  <span class="line-clamp-1 font-medium text-highlighted">{{ article.title }}</span>
                  <UIcon
                    v-if="article.isFeatured"
                    name="i-lucide-star"
                    class="size-4 shrink-0 text-warning"
                  />
                </div>
                <span class="mt-1 block text-xs text-muted">{{ article.slug }}</span>
              </td>
              <td class="px-3 py-4">
                {{ article.author || '—' }}
              </td>
              <td class="px-3 py-4">
                <UBadge
                  :color="statusColor(article.status)"
                  variant="subtle"
                >
                  {{ statusLabel(article.status) }}
                </UBadge>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-muted">
                {{ formatDate(article.publishedAt) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-muted">
                {{ formatDate(article.updatedAt) }}
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-right">
                <UButton
                  :to="`/admin/articles/${article.id}`"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  aria-label="编辑"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  aria-label="删除"
                  @click="requestDelete(article)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="meta.totalPages > 1"
        class="mt-5 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted">
          共 {{ meta.total }} 条，第 {{ meta.page }} / {{ meta.totalPages }} 页
        </p>
        <UPagination
          v-model:page="page"
          :total="meta.total"
          :items-per-page="pageSize"
        />
      </div>
    </UCard>

    <UModal
      v-model:open="deleteOpen"
      title="确认删除文章"
      :description="`删除后无法恢复，请确认是否删除“${selectedArticle?.title ?? ''}”。`"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="deleteOpen = false"
          >
            取消
          </UButton>
          <UButton
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          >
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
