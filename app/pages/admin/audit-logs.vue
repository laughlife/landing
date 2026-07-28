<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: '操作日志 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type AuditItem = {
  id: number
  adminUserId?: number | null
  adminUser?: { id: number, username: string, displayName: string } | null
  module: string
  action: string
  targetType?: string | null
  targetId?: string | number | null
  summary: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}
type PageData<T> = { items?: T[], total?: number, pagination?: { total: number, page: number, pageSize: number } }
type ApiResponse<T> = { success: boolean, data: T, message: string }

const items = ref<AuditItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 30
const keyword = ref('')
const action = ref('ALL')
const loading = ref(false)
const error = ref('')
const detail = ref<AuditItem | null>(null)
const actionOptions = [
  { label: '全部操作', value: 'ALL' }, { label: '登录', value: 'LOGIN' }, { label: '退出', value: 'LOGOUT' },
  { label: '新增', value: 'CREATE' }, { label: '修改', value: 'UPDATE' }, { label: '删除', value: 'DELETE' },
  { label: '发布', value: 'PUBLISH' }, { label: '停用', value: 'DISABLE' }, { label: '上传', value: 'UPLOAD' },
  { label: '删除文件', value: 'DELETE_FILE' }, { label: '修改管理员', value: 'UPDATE_ADMIN' }
]
const actionLabel = Object.fromEntries(actionOptions.slice(1).map(item => [item.value, item.label]))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<PageData<AuditItem> | AuditItem[]>>('/api/admin/audit-logs', {
      query: { page: page.value, pageSize, keyword: keyword.value || undefined, action: action.value === 'ALL' ? undefined : action.value, sortBy: 'createdAt', sortOrder: 'desc' }
    })
    const data = response.data
    items.value = Array.isArray(data) ? data : data.items || []
    total.value = Array.isArray(data) ? data.length : data.pagination?.total ?? data.total ?? items.value.length
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '操作日志加载失败'
  } finally {
    loading.value = false
  }
}

watch([page, action], load)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        操作日志
      </h1><p class="mt-1 text-sm text-muted">
        查看管理员登录和内容维护记录。日志仅供审计，不在前端提供修改入口。
      </p>
    </div>
    <UCard>
      <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <UInput
          v-model="keyword"
          icon="i-lucide-search"
          placeholder="搜索管理员、模块、摘要或目标…"
        /><USelect
          v-model="action"
          :items="actionOptions"
        />
      </div>
    </UCard>
    <AdminOperationsPageState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-title="暂无操作日志"
      @retry="load"
    >
      <div class="overflow-hidden rounded-xl border border-default bg-default">
        <div class="divide-y divide-default md:hidden">
          <button
            v-for="item in items"
            :key="item.id"
            class="w-full p-4 text-left hover:bg-elevated"
            type="button"
            @click="detail = item"
          >
            <div class="flex items-center justify-between gap-3">
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ actionLabel[item.action] || item.action }}
              </UBadge><span class="text-xs text-muted">{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</span>
            </div><p class="mt-3 font-medium text-highlighted">
              {{ item.summary }}
            </p><p class="mt-1 text-sm text-muted">
              {{ item.adminUser?.displayName || item.adminUser?.username || (item.adminUserId ? `管理员 #${item.adminUserId}` : '系统') }} · {{ item.module }}
            </p>
          </button>
        </div>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-left text-sm">
            <thead class="bg-elevated text-xs text-muted">
              <tr>
                <th class="px-4 py-3 font-medium">
                  时间
                </th><th class="px-4 py-3 font-medium">
                  管理员
                </th><th class="px-4 py-3 font-medium">
                  模块
                </th><th class="px-4 py-3 font-medium">
                  操作
                </th><th class="px-4 py-3 font-medium">
                  摘要
                </th><th class="px-4 py-3 font-medium">
                  IP
                </th><th class="px-4 py-3 text-right font-medium">
                  详情
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-elevated/60"
              >
                <td class="whitespace-nowrap px-4 py-3 text-muted">
                  {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
                </td><td class="px-4 py-3 text-highlighted">
                  {{ item.adminUser?.displayName || item.adminUser?.username || (item.adminUserId ? `#${item.adminUserId}` : '系统') }}
                </td><td class="px-4 py-3 text-muted">
                  {{ item.module }}
                </td><td class="px-4 py-3">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                  >
                    {{ actionLabel[item.action] || item.action }}
                  </UBadge>
                </td><td class="max-w-md px-4 py-3">
                  <p class="truncate text-toned">
                    {{ item.summary }}
                  </p><p
                    v-if="item.targetType || item.targetId"
                    class="text-xs text-muted"
                  >
                    {{ item.targetType || '目标' }} #{{ item.targetId || '—' }}
                  </p>
                </td><td class="px-4 py-3 text-muted">
                  {{ item.ipAddress || '—' }}
                </td><td class="px-4 py-3 text-right">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-eye"
                    aria-label="查看详情"
                    @click="detail = item"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AdminOperationsPagination
          v-model:page="page"
          :page-size="pageSize"
          :total="total"
          :disabled="loading"
        />
      </div>
    </AdminOperationsPageState>
    <div
      v-if="detail"
      class="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
      @click.self="detail = null"
    >
      <section class="w-full max-w-2xl rounded-2xl border border-default bg-default p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              操作日志详情
            </h2><p class="mt-1 text-sm text-muted">
              日志编号 #{{ detail.id }}
            </p>
          </div><UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="关闭"
            @click="detail = null"
          />
        </div>
        <dl class="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted">
              发生时间
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ new Date(detail.createdAt).toLocaleString('zh-CN') }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              管理员
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ detail.adminUser?.displayName || detail.adminUser?.username || (detail.adminUserId ? `#${detail.adminUserId}` : '系统') }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              模块 / 操作
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ detail.module }} / {{ actionLabel[detail.action] || detail.action }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              操作目标
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ detail.targetType || '—' }} <span v-if="detail.targetId">#{{ detail.targetId }}</span>
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              IP 地址
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ detail.ipAddress || '—' }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              User-Agent
            </dt><dd class="mt-1 break-all text-sm text-highlighted">
              {{ detail.userAgent || '—' }}
            </dd>
          </div><div class="sm:col-span-2">
            <dt class="text-xs text-muted">
              摘要
            </dt><dd class="mt-1 whitespace-pre-wrap rounded-lg bg-elevated p-3 text-sm text-highlighted">
              {{ detail.summary }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
