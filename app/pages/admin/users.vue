<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: '管理员管理 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type Role = 'SUPER_ADMIN' | 'EDITOR'
type UserStatus = 'ENABLED' | 'DISABLED'
type UserItem = {
  id: number
  username: string
  displayName: string
  email?: string | null
  avatar?: string | null
  role: Role
  status: UserStatus
  lastLoginAt?: string | null
  lastLoginIp?: string | null
  createdAt?: string
}
type UserForm = { username: string, password: string, displayName: string, email: string, avatar: string, role: Role, status: UserStatus }
type PageData<T> = { items?: T[], total?: number, pagination?: { total: number, page: number, pageSize: number } }
type ApiResponse<T> = { success: boolean, data: T, message: string }

const blank = (): UserForm => ({ username: '', password: '', displayName: '', email: '', avatar: '', role: 'EDITOR', status: 'ENABLED' })
const items = ref<UserItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const status = ref('ALL')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const editing = ref<UserItem | null>(null)
const formOpen = ref(false)
const form = ref<UserForm>(blank())
const confirmMode = ref<'save' | 'delete' | null>(null)
const pendingDelete = ref<UserItem | null>(null)
const ownPassword = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const changingPassword = ref(false)
const statusOptions = [{ label: '全部状态', value: 'ALL' }, { label: '已启用', value: 'ENABLED' }, { label: '已停用', value: 'DISABLED' }]
const roleOptions = [{ label: '超级管理员', value: 'SUPER_ADMIN' }, { label: '内容编辑员', value: 'EDITOR' }]

function openCreate() {
  editing.value = null
  form.value = blank()
  formOpen.value = true
}

function openEdit(item: UserItem) {
  editing.value = item
  form.value = { username: item.username, password: '', displayName: item.displayName, email: item.email || '', avatar: item.avatar || '', role: item.role, status: item.status }
  formOpen.value = true
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<PageData<UserItem> | UserItem[]>>('/api/admin/users', {
      query: { page: page.value, pageSize, keyword: keyword.value || undefined, status: status.value === 'ALL' ? undefined : status.value }
    })
    const data = response.data
    items.value = Array.isArray(data) ? data : data.items || []
    total.value = Array.isArray(data) ? data.length : data.pagination?.total ?? data.total ?? items.value.length
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '管理员列表加载失败'
  } finally {
    loading.value = false
  }
}

function requestSave() {
  if (!form.value.username.trim() || !form.value.displayName.trim()) {
    error.value = '用户名和显示名称不能为空'
    return
  }
  if (!editing.value && form.value.password.length < 12) {
    error.value = '新管理员密码至少需要 12 位'
    return
  }
  const criticalChange = editing.value && (editing.value.role !== form.value.role || editing.value.status !== form.value.status)
  if (criticalChange) confirmMode.value = 'save'
  else save()
}

async function save() {
  saving.value = true
  error.value = ''
  confirmMode.value = null
  try {
    const body = {
      ...form.value,
      email: form.value.email.trim() || null,
      avatar: form.value.avatar.trim() || null,
      password: form.value.password || undefined
    }
    const endpoint = editing.value ? `/api/admin/users/${editing.value.id}` : '/api/admin/users'
    const response = await $fetch<ApiResponse<UserItem>>(endpoint, { method: editing.value ? 'PATCH' : 'POST', body })
    notice.value = response.message || (editing.value ? '管理员已更新' : '管理员已创建')
    formOpen.value = false
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!pendingDelete.value) return
  saving.value = true
  try {
    const response = await $fetch<ApiResponse<unknown>>(`/api/admin/users/${pendingDelete.value.id}`, { method: 'DELETE' })
    notice.value = response.message || '管理员已删除'
    pendingDelete.value = null
    confirmMode.value = null
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '删除失败；不能删除当前账号或受保护的超级管理员'
  } finally {
    saving.value = false
  }
}

async function changeOwnPassword() {
  if (ownPassword.value.newPassword.length < 12 || ownPassword.value.newPassword !== ownPassword.value.confirmPassword) {
    error.value = '新密码至少 12 位，且两次输入必须一致'
    return
  }
  changingPassword.value = true
  try {
    const response = await $fetch<ApiResponse<unknown>>('/api/auth/change-password', {
      method: 'POST', body: { currentPassword: ownPassword.value.currentPassword, newPassword: ownPassword.value.newPassword }
    })
    notice.value = response.message || '登录密码已修改'
    ownPassword.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '密码修改失败'
  } finally {
    changingPassword.value = false
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
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          管理员管理
        </h1><p class="mt-1 text-sm text-muted">
          维护后台账号、角色和登录状态。
        </p>
      </div><UButton
        icon="i-lucide-user-plus"
        label="新增编辑员"
        @click="openCreate"
      />
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
          placeholder="搜索用户名、显示名称或邮箱…"
        /><USelect
          v-model="status"
          :items="statusOptions"
        />
      </div>
    </UCard>
    <AdminOperationsPageState
      :loading="loading"
      :error="error && !items.length ? error : ''"
      :empty="!items.length"
      empty-title="暂无管理员"
      @retry="load"
    >
      <div class="overflow-hidden rounded-xl border border-default bg-default">
        <div class="grid gap-3 divide-y divide-default md:hidden">
          <div
            v-for="item in items"
            :key="item.id"
            class="p-4"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-highlighted">
                  {{ item.displayName }}
                </p><p class="text-sm text-muted">
                  @{{ item.username }}
                </p>
              </div><UBadge
                :color="item.status === 'ENABLED' ? 'success' : 'neutral'"
                variant="subtle"
              >
                {{ item.status === 'ENABLED' ? '已启用' : '已停用' }}
              </UBadge>
            </div><p class="mt-3 text-sm text-toned">
              {{ item.role === 'SUPER_ADMIN' ? '超级管理员' : '内容编辑员' }} · {{ item.email || '未设置邮箱' }}
            </p><UButton
              class="mt-3"
              size="sm"
              color="neutral"
              variant="outline"
              icon="i-lucide-pencil"
              label="编辑"
              @click="openEdit(item)"
            />
          </div>
        </div>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full text-left text-sm">
            <thead class="bg-elevated text-xs text-muted">
              <tr>
                <th class="px-4 py-3 font-medium">
                  管理员
                </th><th class="px-4 py-3 font-medium">
                  角色
                </th><th class="px-4 py-3 font-medium">
                  状态
                </th><th class="px-4 py-3 font-medium">
                  最近登录
                </th><th class="px-4 py-3 font-medium">
                  登录 IP
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
                    {{ item.displayName }}
                  </p><p class="text-xs text-muted">
                    @{{ item.username }} · {{ item.email || '未设置邮箱' }}
                  </p>
                </td><td class="px-4 py-3">
                  <UBadge
                    color="neutral"
                    variant="subtle"
                  >
                    {{ item.role === 'SUPER_ADMIN' ? '超级管理员' : '内容编辑员' }}
                  </UBadge>
                </td><td class="px-4 py-3">
                  <UBadge
                    :color="item.status === 'ENABLED' ? 'success' : 'neutral'"
                    variant="subtle"
                  >
                    {{ item.status === 'ENABLED' ? '已启用' : '已停用' }}
                  </UBadge>
                </td><td class="whitespace-nowrap px-4 py-3 text-muted">
                  {{ item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString('zh-CN') : '从未登录' }}
                </td><td class="px-4 py-3 text-muted">
                  {{ item.lastLoginIp || '—' }}
                </td><td class="px-4 py-3">
                  <div class="flex justify-end gap-1">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-pencil"
                      label="编辑"
                      @click="openEdit(item)"
                    /><UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      aria-label="删除管理员"
                      @click="pendingDelete = item; confirmMode = 'delete'"
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
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold text-highlighted">
            修改我的密码
          </h2><p class="mt-1 text-sm text-muted">
            修改后请使用新密码继续登录。
          </p>
        </div>
      </template>
      <div class="grid gap-4 lg:grid-cols-3">
        <UFormField label="当前密码">
          <UInput
            v-model="ownPassword.currentPassword"
            type="password"
            class="w-full"
          />
        </UFormField><UFormField
          label="新密码"
          hint="至少 12 位"
        >
          <UInput
            v-model="ownPassword.newPassword"
            type="password"
            class="w-full"
          />
        </UFormField><UFormField label="确认新密码">
          <UInput
            v-model="ownPassword.confirmPassword"
            type="password"
            class="w-full"
          />
        </UFormField>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-key-round"
            label="修改密码"
            :loading="changingPassword"
            @click="changeOwnPassword"
          />
        </div>
      </template>
    </UCard>
    <div
      v-if="formOpen"
      class="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/60 p-4"
      @click.self="formOpen = false"
    >
      <section class="w-full max-w-xl rounded-2xl border border-default bg-default p-6">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-highlighted">
            {{ editing ? '编辑管理员' : '新增管理员' }}
          </h2><UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="关闭"
            @click="formOpen = false"
          />
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <UFormField
            label="用户名"
            required
          >
            <UInput
              v-model="form.username"
              class="w-full"
              :disabled="Boolean(editing)"
            />
          </UFormField><UFormField
            :label="editing ? '重置密码（选填）' : '初始密码'"
            :hint="editing ? '留空则不修改' : '至少 12 位'"
            required
          >
            <UInput
              v-model="form.password"
              type="password"
              class="w-full"
            />
          </UFormField><UFormField
            label="显示名称"
            required
          >
            <UInput
              v-model="form.displayName"
              class="w-full"
            />
          </UFormField><UFormField label="邮箱">
            <UInput
              v-model="form.email"
              type="email"
              class="w-full"
            />
          </UFormField><UFormField label="头像路径">
            <UInput
              v-model="form.avatar"
              class="w-full"
              placeholder="/uploads/..."
            />
          </UFormField><UFormField label="角色">
            <USelect
              v-model="form.role"
              class="w-full"
              :items="roleOptions"
            />
          </UFormField><UFormField label="状态">
            <USelect
              v-model="form.status"
              class="w-full"
              :items="statusOptions.slice(1)"
            />
          </UFormField>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="取消"
            @click="formOpen = false"
          /><UButton
            icon="i-lucide-save"
            :label="editing ? '保存修改' : '创建管理员'"
            :loading="saving"
            @click="requestSave"
          />
        </div>
      </section>
    </div>
    <AdminOperationsConfirmDialog
      :open="confirmMode === 'save'"
      title="确认权限变更？"
      description="角色或账号状态发生变化，可能立即影响该管理员的访问权限。请确认后继续。"
      confirm-label="确认保存"
      :loading="saving"
      @cancel="confirmMode = null"
      @confirm="save"
    />
    <AdminOperationsConfirmDialog
      :open="confirmMode === 'delete'"
      title="删除管理员？"
      :description="`将删除管理员“${pendingDelete?.displayName || ''}”。当前登录账号和受保护的超级管理员不能被删除。`"
      confirm-label="确认删除"
      danger
      :loading="saving"
      @cancel="confirmMode = null; pendingDelete = null"
      @confirm="remove"
    />
  </div>
</template>
