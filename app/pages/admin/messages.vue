<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: '咨询留言 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type MessageStatus = 'NEW' | 'PROCESSING' | 'RESOLVED' | 'SPAM'
type MessageItem = {
  id: number
  name: string
  company?: string | null
  phone?: string | null
  email?: string | null
  subject?: string | null
  message: string
  sourcePage?: string | null
  productId?: number | null
  product?: { id: number, name: string } | null
  status: MessageStatus
  adminRemark?: string | null
  createdAt: string
}
type PageData<T> = { items?: T[], total?: number, pagination?: { total: number, page: number, pageSize: number } }
type ApiResponse<T> = { success: boolean, data: T, message: string }

const items = ref<MessageItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const status = ref('ALL')
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const error = ref('')
const notice = ref('')
const selected = ref<MessageItem | null>(null)
const pendingDelete = ref<MessageItem | null>(null)
const editStatus = ref<MessageStatus>('NEW')
const adminRemark = ref('')
const statusOptions = [
  { label: '全部状态', value: 'ALL' }, { label: '新留言', value: 'NEW' }, { label: '处理中', value: 'PROCESSING' },
  { label: '已解决', value: 'RESOLVED' }, { label: '垃圾信息', value: 'SPAM' }
]
const statusLabel: Record<MessageStatus, string> = { NEW: '新留言', PROCESSING: '处理中', RESOLVED: '已解决', SPAM: '垃圾信息' }
const statusColor: Record<MessageStatus, 'info' | 'warning' | 'success' | 'neutral'> = { NEW: 'info', PROCESSING: 'warning', RESOLVED: 'success', SPAM: 'neutral' }

function openDetail(item: MessageItem) {
  selected.value = item
  editStatus.value = item.status
  adminRemark.value = item.adminRemark || ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<PageData<MessageItem> | MessageItem[]>>('/api/admin/messages', {
      query: { page: page.value, pageSize, keyword: keyword.value || undefined, status: status.value === 'ALL' ? undefined : status.value, sortBy: 'createdAt', sortOrder: 'desc' }
    })
    const data = response.data
    items.value = Array.isArray(data) ? data : data.items || []
    total.value = Array.isArray(data) ? data.length : data.pagination?.total ?? data.total ?? items.value.length
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '留言加载失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!selected.value) return
  saving.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<MessageItem>>(`/api/admin/messages/${selected.value.id}`, {
      method: 'PATCH', body: { status: editStatus.value, adminRemark: adminRemark.value.trim() || null }
    })
    notice.value = response.message || '留言处理状态已更新'
    selected.value = response.data
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    const response = await $fetch<ApiResponse<unknown>>(`/api/admin/messages/${pendingDelete.value.id}`, { method: 'DELETE' })
    notice.value = response.message || '留言已删除'
    if (selected.value?.id === pendingDelete.value.id) selected.value = null
    pendingDelete.value = null
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '删除失败；仅超级管理员可执行此操作'
  } finally {
    deleting.value = false
  }
}

watch([page, status], load)
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
        咨询留言
      </h1><p class="mt-1 text-sm text-muted">
        跟进官网咨询，记录处理状态和内部备注。
      </p>
    </div>
    <UAlert
      v-if="notice"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :description="notice"
      :close="{ onClick: () => notice = '' }"
    />
    <UAlert
      v-if="error && items.length"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="error"
    />
    <UCard>
      <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <UInput
          v-model="keyword"
          icon="i-lucide-search"
          placeholder="搜索姓名、企业、电话或主题…"
        />
        <USelect
          v-model="status"
          :items="statusOptions"
        />
      </div>
    </UCard>
    <AdminOperationsPageState
      :loading="loading"
      :error="error && !items.length ? error : ''"
      :empty="!items.length"
      empty-title="暂无咨询留言"
      @retry="load"
    >
      <div class="overflow-hidden rounded-xl border border-default bg-default">
        <div class="divide-y divide-default md:hidden">
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="w-full p-4 text-left hover:bg-elevated"
            @click="openDetail(item)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-medium text-highlighted">
                  {{ item.name }}
                </p><p class="mt-1 text-sm text-muted">
                  {{ item.company || item.phone || item.email || '未留其他联系方式' }}
                </p>
              </div><UBadge
                :color="statusColor[item.status]"
                variant="subtle"
              >
                {{ statusLabel[item.status] }}
              </UBadge>
            </div>
            <p class="mt-3 line-clamp-2 text-sm text-toned">
              {{ item.subject || item.message }}
            </p>
            <p class="mt-2 text-xs text-dimmed">
              {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
            </p>
          </button>
        </div>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-left text-sm">
            <thead class="bg-elevated text-xs text-muted">
              <tr>
                <th class="px-4 py-3 font-medium">
                  联系人
                </th><th class="px-4 py-3 font-medium">
                  主题 / 内容
                </th><th class="px-4 py-3 font-medium">
                  关联产品
                </th><th class="px-4 py-3 font-medium">
                  状态
                </th><th class="px-4 py-3 font-medium">
                  提交时间
                </th><th class="px-4 py-3 text-right font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="item in items"
                :key="item.id"
                class="hover:bg-elevated/60"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-highlighted">
                    {{ item.name }}
                  </p><p class="text-xs text-muted">
                    {{ item.company || item.phone || item.email || '—' }}
                  </p>
                </td>
                <td class="max-w-sm px-4 py-3">
                  <p class="truncate font-medium text-toned">
                    {{ item.subject || '未填写主题' }}
                  </p><p class="truncate text-xs text-muted">
                    {{ item.message }}
                  </p>
                </td>
                <td class="px-4 py-3 text-muted">
                  {{ item.product?.name || (item.productId ? `#${item.productId}` : '—') }}
                </td>
                <td class="px-4 py-3">
                  <UBadge
                    :color="statusColor[item.status]"
                    variant="subtle"
                  >
                    {{ statusLabel[item.status] }}
                  </UBadge>
                </td>
                <td class="whitespace-nowrap px-4 py-3 text-muted">
                  {{ new Date(item.createdAt).toLocaleString('zh-CN') }}
                </td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-eye"
                      label="查看"
                      @click="openDetail(item)"
                    /><UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      aria-label="删除留言"
                      @click="pendingDelete = item"
                    />
                  </div>
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
      v-if="selected"
      class="fixed inset-0 z-40 flex justify-end bg-black/60"
      @click.self="selected = null"
    >
      <aside class="h-full w-full max-w-xl overflow-y-auto border-l border-default bg-default p-5 sm:p-7">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-highlighted">
              {{ selected.subject || '咨询详情' }}
            </h2><p class="mt-1 text-sm text-muted">
              {{ new Date(selected.createdAt).toLocaleString('zh-CN') }}
            </p>
          </div><UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="关闭"
            @click="selected = null"
          />
        </div>
        <dl class="mt-6 grid gap-4 rounded-xl bg-elevated p-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted">
              联系人
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ selected.name }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              企业
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ selected.company || '—' }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              电话
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ selected.phone || '—' }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              邮箱
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ selected.email || '—' }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              来源页面
            </dt><dd class="mt-1 break-all text-sm text-highlighted">
              {{ selected.sourcePage || '—' }}
            </dd>
          </div><div>
            <dt class="text-xs text-muted">
              关联产品
            </dt><dd class="mt-1 text-sm text-highlighted">
              {{ selected.product?.name || (selected.productId ? `#${selected.productId}` : '—') }}
            </dd>
          </div>
        </dl>
        <div class="mt-6">
          <p class="text-sm font-medium text-highlighted">
            留言内容
          </p><p class="mt-2 whitespace-pre-wrap rounded-xl border border-default p-4 text-sm leading-6 text-toned">
            {{ selected.message }}
          </p>
        </div>
        <div class="mt-6 space-y-4 border-t border-default pt-6">
          <UFormField label="处理状态">
            <USelect
              v-model="editStatus"
              class="w-full"
              :items="statusOptions.slice(1)"
            />
          </UFormField>
          <UFormField label="管理员备注">
            <UTextarea
              v-model="adminRemark"
              class="w-full"
              :rows="6"
              maxlength="10000"
            />
          </UFormField>
          <div class="flex justify-between gap-3">
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              label="删除留言"
              @click="pendingDelete = selected"
            /><UButton
              icon="i-lucide-save"
              label="保存处理结果"
              :loading="saving"
              @click="save"
            />
          </div>
        </div>
      </aside>
    </div>
    <AdminOperationsConfirmDialog
      :open="Boolean(pendingDelete)"
      title="删除咨询留言？"
      :description="`此操作将永久删除“${pendingDelete?.subject || pendingDelete?.name || ''}”的留言记录，且仅超级管理员可以执行。`"
      confirm-label="确认删除"
      danger
      :loading="deleting"
      @cancel="pendingDelete = null"
      @confirm="remove"
    />
  </div>
</template>
