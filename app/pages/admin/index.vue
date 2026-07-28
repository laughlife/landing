<script setup lang="ts">
interface DashboardStats {
  productCount: number
  publishedProductCount: number
  categoryCount: number
  partnerCount: number
  pendingMessageCount: number
  articleCount: number
  mediaCount: number
}

interface RecentMessage {
  id: number
  name: string
  subject?: string | null
  message?: string | null
  status: 'NEW' | 'PROCESSING' | 'RESOLVED' | 'SPAM'
  createdAt: string
}

interface RecentChange {
  id: number
  summary: string
  module: string
  action: string
  createdAt: string
  adminUser?: {
    displayName: string
  } | null
}

interface RecentLogin {
  id: number
  summary?: string
  ipAddress?: string | null
  createdAt: string
  adminUser?: {
    displayName: string
    username?: string
  } | null
}

interface DashboardData {
  stats?: DashboardStats
  productCount?: number
  publishedProductCount?: number
  categoryCount?: number
  partnerCount?: number
  pendingMessageCount?: number
  articleCount?: number
  mediaCount?: number
  products?: number
  publishedProducts?: number
  categories?: number
  partners?: number
  pendingMessages?: number
  articles?: number
  mediaFiles?: number
  recentMessages?: RecentMessage[]
  recentChanges?: RecentChange[]
  recentLogins?: RecentLogin[]
  recentLogs?: RecentChange[]
}

interface DashboardView {
  stats: DashboardStats
  recentMessages: RecentMessage[]
  recentChanges: RecentChange[]
  recentLogins: RecentLogin[]
}

definePageMeta({
  layout: 'admin',
  middleware: 'admin'
})

useSeoMeta({
  title: '控制台 - 网站管理后台',
  robots: 'noindex, nofollow'
})

const { request, currentUser } = useAdminApi()
const isSuperAdmin = computed(() => currentUser.value?.role === 'SUPER_ADMIN')
const {
  data: dashboardData,
  status,
  error,
  refresh
} = await useAsyncData('admin-dashboard', () => request<DashboardData>('/api/admin/dashboard'), {
  lazy: true
})

const dashboard = computed<DashboardView | null>(() => {
  const data = dashboardData.value
  if (!data) return null

  const recentLogs = data.recentLogs ?? []
  return {
    stats: data.stats ?? {
      productCount: data.productCount ?? data.products ?? 0,
      publishedProductCount: data.publishedProductCount ?? data.publishedProducts ?? 0,
      categoryCount: data.categoryCount ?? data.categories ?? 0,
      partnerCount: data.partnerCount ?? data.partners ?? 0,
      pendingMessageCount: data.pendingMessageCount ?? data.pendingMessages ?? 0,
      articleCount: data.articleCount ?? data.articles ?? 0,
      mediaCount: data.mediaCount ?? data.mediaFiles ?? 0
    },
    recentMessages: data.recentMessages ?? [],
    recentChanges: data.recentChanges ?? recentLogs.filter(item => item.action !== 'LOGIN' && item.action !== 'LOGOUT'),
    recentLogins: data.recentLogins ?? recentLogs.filter(item => item.action === 'LOGIN')
  }
})

const statCards = computed(() => {
  const stats = dashboard.value?.stats
  if (!stats) return []
  return [
    { label: '产品总数', value: stats.productCount, icon: 'i-lucide-package', to: '/admin/products', tone: 'primary' as const },
    { label: '已发布产品', value: stats.publishedProductCount, icon: 'i-lucide-circle-check-big', to: '/admin/products', tone: 'success' as const },
    { label: '产品分类', value: stats.categoryCount, icon: 'i-lucide-tags', to: '/admin/categories', tone: 'neutral' as const },
    { label: '合作伙伴', value: stats.partnerCount, icon: 'i-lucide-network', to: '/admin/partners', tone: 'info' as const },
    { label: '待处理留言', value: stats.pendingMessageCount, icon: 'i-lucide-message-circle-more', to: '/admin/messages', tone: 'warning' as const },
    { label: '新闻资讯', value: stats.articleCount, icon: 'i-lucide-newspaper', to: '/admin/articles', tone: 'neutral' as const },
    { label: '媒体文件', value: stats.mediaCount, icon: 'i-lucide-images', to: '/admin/media', tone: 'neutral' as const }
  ]
})

const quickActions = [
  { label: '新增产品', description: '创建并完善新的产品内容', icon: 'i-lucide-package-plus', to: '/admin/products/new' },
  { label: '发布文章', description: '撰写一篇新的新闻资讯', icon: 'i-lucide-file-plus-2', to: '/admin/articles/new' },
  { label: '处理留言', description: '查看客户最新咨询', icon: 'i-lucide-messages-square', to: '/admin/messages' },
  { label: '上传媒体', description: '管理图片和文档资源', icon: 'i-lucide-cloud-upload', to: '/admin/media' }
]

const messageStatus = {
  NEW: { label: '待处理', color: 'warning' as const },
  PROCESSING: { label: '处理中', color: 'info' as const },
  RESOLVED: { label: '已完成', color: 'success' as const },
  SPAM: { label: '垃圾信息', color: 'neutral' as const }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}
</script>

<template>
  <div class="space-y-8">
    <section class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="text-sm font-medium text-primary">
          管理控制台
        </p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
          {{ currentUser?.displayName ? `${currentUser.displayName}，欢迎回来` : '欢迎回来' }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          这里汇总了网站内容和待办事项的最新状态。
        </p>
      </div>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        刷新数据
      </UButton>
    </section>

    <template v-if="status === 'pending' && !dashboardData">
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <USkeleton
          v-for="index in 7"
          :key="index"
          class="h-36 rounded-xl"
        />
      </section>
      <section class="grid gap-6 xl:grid-cols-2">
        <USkeleton class="h-80 rounded-xl" />
        <USkeleton class="h-80 rounded-xl" />
      </section>
    </template>

    <UCard v-else-if="error && !dashboardData">
      <AdminDashboardState
        icon="i-lucide-cloud-off"
        title="控制台数据加载失败"
        :description="getAdminApiErrorMessage(error, '请检查网络连接后重试')"
        action-label="重新加载"
        @action="refresh()"
      />
    </UCard>

    <template v-else-if="dashboard">
      <section aria-labelledby="overview-title">
        <div class="mb-4 flex items-center justify-between">
          <h2
            id="overview-title"
            class="text-base font-semibold text-highlighted"
          >
            内容概览
          </h2>
          <span
            v-if="status === 'pending'"
            class="flex items-center gap-2 text-xs text-muted"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-3.5 animate-spin"
            />
            更新中
          </span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            v-for="card in statCards"
            :key="card.label"
            v-bind="card"
          />
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2
          id="quick-actions-title"
          class="mb-4 text-base font-semibold text-highlighted"
        >
          快速操作
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <UCard
            v-for="action in quickActions"
            :key="action.to"
            :to="action.to"
            variant="subtle"
            class="group"
            :ui="{ body: 'p-4' }"
          >
            <div class="flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <UIcon
                  :name="action.icon"
                  class="size-5"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-highlighted">{{ action.label }}</span>
                <span class="block truncate text-xs text-muted">{{ action.description }}</span>
              </span>
              <UIcon
                name="i-lucide-chevron-right"
                class="size-4 text-dimmed transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </UCard>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-2">
        <UCard :ui="{ body: 'p-0', header: 'flex items-center justify-between' }">
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">
                最近留言
              </h2>
              <p class="mt-1 text-xs text-muted">
                客户提交的最新咨询
              </p>
            </div>
            <UButton
              to="/admin/messages"
              color="neutral"
              variant="ghost"
              size="sm"
              trailing-icon="i-lucide-arrow-right"
            >
              全部留言
            </UButton>
          </template>

          <ul
            v-if="dashboard.recentMessages.length"
            class="divide-y divide-default"
          >
            <li
              v-for="item in dashboard.recentMessages"
              :key="item.id"
            >
              <NuxtLink
                to="/admin/messages"
                class="block p-5 transition-colors hover:bg-elevated/60"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-highlighted">
                      {{ item.subject || `${item.name} 的咨询` }}
                    </p>
                    <p
                      v-if="item.message"
                      class="mt-1 line-clamp-2 text-sm text-muted"
                    >
                      {{ item.message }}
                    </p>
                  </div>
                  <UBadge
                    :color="messageStatus[item.status].color"
                    variant="subtle"
                    size="sm"
                  >
                    {{ messageStatus[item.status].label }}
                  </UBadge>
                </div>
                <div class="mt-3 flex items-center justify-between gap-3 text-xs text-dimmed">
                  <span>{{ item.name }}</span>
                  <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
                </div>
              </NuxtLink>
            </li>
          </ul>
          <AdminDashboardState
            v-else
            title="暂无咨询留言"
            description="收到新的客户咨询后会显示在这里。"
          />
        </UCard>

        <UCard
          v-if="isSuperAdmin"
          :ui="{ body: 'p-0', header: 'flex items-center justify-between' }"
        >
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">
                最近修改
              </h2>
              <p class="mt-1 text-xs text-muted">
                后台内容的最新操作记录
              </p>
            </div>
            <UButton
              to="/admin/audit-logs"
              color="neutral"
              variant="ghost"
              size="sm"
              trailing-icon="i-lucide-arrow-right"
            >
              操作日志
            </UButton>
          </template>

          <ul
            v-if="dashboard.recentChanges.length"
            class="divide-y divide-default"
          >
            <li
              v-for="item in dashboard.recentChanges"
              :key="item.id"
              class="flex gap-3 p-5"
            >
              <span class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                <UIcon
                  name="i-lucide-file-pen-line"
                  class="size-4"
                />
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted">
                  {{ item.summary }}
                </p>
                <p class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-dimmed">
                  <span>{{ item.adminUser?.displayName || '系统' }}</span>
                  <span aria-hidden="true">·</span>
                  <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
                </p>
              </div>
            </li>
          </ul>
          <AdminDashboardState
            v-else
            title="暂无修改记录"
            description="内容发生变更后会显示在这里。"
          />
        </UCard>
      </section>

      <section v-if="isSuperAdmin">
        <UCard :ui="{ body: 'p-0' }">
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">
                最近登录
              </h2>
              <p class="mt-1 text-xs text-muted">
                管理员账号的近期登录记录
              </p>
            </div>
          </template>

          <div
            v-if="dashboard.recentLogins.length"
            class="overflow-x-auto"
          >
            <table class="w-full min-w-[640px] text-left text-sm">
              <thead class="border-b border-default bg-elevated/50 text-xs text-muted">
                <tr>
                  <th class="px-5 py-3 font-medium">
                    管理员
                  </th>
                  <th class="px-5 py-3 font-medium">
                    登录 IP
                  </th>
                  <th class="px-5 py-3 font-medium">
                    说明
                  </th>
                  <th class="px-5 py-3 text-right font-medium">
                    登录时间
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr
                  v-for="item in dashboard.recentLogins"
                  :key="item.id"
                >
                  <td class="px-5 py-4 font-medium text-highlighted">
                    {{ item.adminUser?.displayName || item.adminUser?.username || '未知管理员' }}
                  </td>
                  <td class="px-5 py-4 font-mono text-xs text-muted">
                    {{ item.ipAddress || '未记录' }}
                  </td>
                  <td class="px-5 py-4 text-muted">
                    {{ item.summary || '登录管理后台' }}
                  </td>
                  <td class="px-5 py-4 text-right text-muted">
                    <time :datetime="item.createdAt">{{ formatDate(item.createdAt) }}</time>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <AdminDashboardState
            v-else
            title="暂无登录记录"
          />
        </UCard>
      </section>
    </template>
  </div>
</template>
