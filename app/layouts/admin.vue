<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const route = useRoute()
const colorMode = useColorMode()
const toast = useToast()
const { currentUser, logout } = useAdminApi()

const collapsed = ref(false)
const loggingOut = ref(false)

const pageTitles: Record<string, string> = {
  '/admin': '控制台',
  '/admin/company': '公司信息',
  '/admin/banners': '首页轮播',
  '/admin/services': '服务项目',
  '/admin/articles': '新闻资讯',
  '/admin/categories': '产品分类',
  '/admin/products': '产品列表',
  '/admin/partners': '合作伙伴',
  '/admin/media': '媒体库',
  '/admin/messages': '咨询留言',
  '/admin/settings': '网站设置',
  '/admin/users': '管理员管理',
  '/admin/audit-logs': '操作日志'
}

const currentTitle = computed(() => {
  const exactTitle = pageTitles[route.path]
  if (exactTitle) return exactTitle
  const parentPath = Object.keys(pageTitles)
    .filter(path => path !== '/admin' && route.path.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0]
  return parentPath ? pageTitles[parentPath] : '管理后台'
})

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: value => colorMode.preference = value ? 'dark' : 'light'
})

const roleLabel = computed(() => currentUser.value?.role === 'SUPER_ADMIN' ? '超级管理员' : '内容编辑')

const accountMenu = computed<DropdownMenuItem[][]>(() => [
  [{
    label: currentUser.value?.displayName || currentUser.value?.username || '管理员',
    icon: 'i-lucide-user-round',
    type: 'label'
  }],
  [{
    label: '访问官网',
    icon: 'i-lucide-external-link',
    to: '/',
    target: '_blank'
  }],
  [{
    label: '退出登录',
    icon: 'i-lucide-log-out',
    color: 'error',
    disabled: loggingOut.value,
    onSelect: handleLogout
  }]
])

useHead({
  title: computed(() => `${currentTitle.value} - 网站管理后台`),
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'googlebot', content: 'noindex, nofollow' }
  ]
})

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await logout()
    toast.add({ title: '已安全退出', color: 'success' })
    await navigateTo('/admin/login')
  } catch (error) {
    toast.add({
      title: '退出失败',
      description: getAdminApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <UDashboardGroup class="min-h-screen bg-default">
    <UDashboardSidebar
      id="admin-sidebar"
      v-model:collapsed="collapsed"
      collapsible
      resizable
      :min-size="14"
      :max-size="24"
      :default-size="18"
      :collapsed-size="4"
      :ui="{ body: 'gap-3 px-3 py-4', footer: 'border-t border-default p-3' }"
    >
      <template #header="{ collapsed: isCollapsed }">
        <AdminBrand :collapsed="isCollapsed" />
      </template>

      <template #default="{ collapsed: isCollapsed }">
        <AdminSidebarNavigation :collapsed="isCollapsed" />
      </template>

      <template #footer="{ collapsed: isCollapsed }">
        <UDropdownMenu
          :items="accountMenu"
          :content="{ align: 'start', side: 'right' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            block
            :loading="loggingOut"
            :class="isCollapsed ? 'justify-center px-2' : 'justify-start'"
          >
            <UAvatar
              :alt="currentUser?.displayName || currentUser?.username || '管理员'"
              size="xs"
              class="shrink-0"
            />
            <span
              v-if="!isCollapsed"
              class="min-w-0 flex-1 text-left"
            >
              <span class="block truncate text-sm font-medium">
                {{ currentUser?.displayName || currentUser?.username || '管理员' }}
              </span>
              <span class="block truncate text-xs font-normal text-muted">{{ roleLabel }}</span>
            </span>
            <UIcon
              v-if="!isCollapsed"
              name="i-lucide-chevrons-up-down"
              class="size-4 text-muted"
            />
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel id="admin-main">
      <template #header>
        <UDashboardNavbar :title="currentTitle">
          <template #right>
            <UTooltip :text="isDark ? '切换到浅色模式' : '切换到深色模式'">
              <UButton
                color="neutral"
                variant="ghost"
                :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
                :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
                @click="isDark = !isDark"
              />
            </UTooltip>
            <UButton
              to="/"
              target="_blank"
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              aria-label="在新窗口访问官网"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
