<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const navigationItems: NavigationMenuItem[][] = [
  [{
    label: '控制台',
    icon: 'i-lucide-layout-dashboard',
    to: '/admin',
    exact: true
  }],
  [{
    label: '内容管理',
    type: 'label'
  }, {
    label: '公司信息',
    icon: 'i-lucide-building-2',
    to: '/admin/company'
  }, {
    label: '首页轮播',
    icon: 'i-lucide-gallery-horizontal-end',
    to: '/admin/banners'
  }, {
    label: '服务项目',
    icon: 'i-lucide-handshake',
    to: '/admin/services'
  }, {
    label: '新闻资讯',
    icon: 'i-lucide-newspaper',
    to: '/admin/articles'
  }],
  [{
    label: '产品管理',
    type: 'label'
  }, {
    label: '产品分类',
    icon: 'i-lucide-tags',
    to: '/admin/categories'
  }, {
    label: '产品列表',
    icon: 'i-lucide-package',
    to: '/admin/products'
  }],
  [{
    label: '运营管理',
    type: 'label'
  }, {
    label: '合作伙伴',
    icon: 'i-lucide-network',
    to: '/admin/partners'
  }, {
    label: '媒体库',
    icon: 'i-lucide-images',
    to: '/admin/media'
  }, {
    label: '咨询留言',
    icon: 'i-lucide-messages-square',
    to: '/admin/messages'
  }, {
    label: '网站设置',
    icon: 'i-lucide-settings-2',
    to: '/admin/settings'
  }],
  [{
    label: '系统管理',
    type: 'label'
  }, {
    label: '管理员管理',
    icon: 'i-lucide-shield-check',
    to: '/admin/users'
  }, {
    label: '操作日志',
    icon: 'i-lucide-scroll-text',
    to: '/admin/audit-logs'
  }]
]
</script>

<template>
  <UNavigationMenu
    :items="navigationItems"
    orientation="vertical"
    :collapsed="collapsed"
    tooltip
    popover
    class="w-full"
  />
</template>
