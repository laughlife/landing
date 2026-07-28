<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const statusOptions = [
  { label: '全部状态', value: 'ALL' },
  { label: '已启用', value: 'ENABLED' },
  { label: '已停用', value: 'DISABLED' }
]

const fields = [
  { key: 'title', label: '标题', required: true, wide: true },
  { key: 'subtitle', label: '副标题', kind: 'textarea', wide: true },
  { key: 'image', label: 'PC 图片地址', placeholder: '/uploads/...' },
  { key: 'mobileImage', label: '移动端图片地址', placeholder: '/uploads/...' },
  { key: 'buttonText', label: '按钮文字' },
  { key: 'buttonLink', label: '按钮链接', placeholder: '/contact 或 https://...' },
  { key: 'position', label: '展示位置', required: true },
  { key: 'sortOrder', label: '排序', kind: 'number' },
  { key: 'startAt', label: '开始时间', kind: 'datetime' },
  { key: 'endAt', label: '结束时间', kind: 'datetime' },
  { key: 'status', label: '状态', kind: 'select', options: statusOptions.slice(1) }
] as const

const columns = [
  { key: 'title', label: '标题' },
  { key: 'position', label: '展示位置' },
  { key: 'sortOrder', label: '排序' },
  { key: 'status', label: '状态' },
  { key: 'startAt', label: '开始时间' },
  { key: 'endAt', label: '结束时间' }
]
</script>

<template>
  <AdminContentCrudPage
    title="首页轮播"
    description="管理桌面端与移动端轮播素材、按钮和有效时间。"
    singular="Banner"
    endpoint="/api/admin/banners"
    :fields="fields"
    :columns="columns"
    :status-options="statusOptions"
    :defaults="{ status: 'ENABLED', position: 'HOME_HERO', sortOrder: 0 }"
  />
</template>
