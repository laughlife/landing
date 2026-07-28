<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已启用', value: 'ENABLED' },
  { label: '已停用', value: 'DISABLED' }
]

const fields = [
  { key: 'name', label: '服务名称', required: true },
  { key: 'slug', label: 'Slug', required: true, placeholder: 'service-name' },
  { key: 'icon', label: '图标', placeholder: 'i-lucide-handshake', description: '填写 Iconify 图标名称。' },
  { key: 'coverImage', label: '封面图地址', placeholder: '/uploads/...' },
  { key: 'summary', label: '服务摘要', kind: 'textarea', wide: true },
  { key: 'description', label: '详细介绍', kind: 'richtext', wide: true, description: '使用富文本工具栏维护详情内容。' },
  { key: 'features', label: '服务特点', kind: 'string-list', wide: true, placeholder: '输入一项服务特点' },
  { key: 'processSteps', label: '服务流程', kind: 'steps', wide: true },
  { key: 'sortOrder', label: '排序', kind: 'number' },
  { key: 'status', label: '状态', kind: 'select', options: statusOptions.slice(1) },
  { key: 'isFeatured', label: '首页推荐', kind: 'switch' },
  { key: 'seoTitle', label: 'SEO 标题', wide: true },
  { key: 'seoDescription', label: 'SEO 描述', kind: 'textarea', wide: true }
] as const

const columns = [
  { key: 'name', label: '服务名称' },
  { key: 'slug', label: 'Slug' },
  { key: 'sortOrder', label: '排序' },
  { key: 'status', label: '状态' },
  { key: 'updatedAt', label: '更新时间' }
]
</script>

<template>
  <AdminContentContentCrudPage
    title="服务项目"
    description="维护主营服务、服务特点和可视化流程步骤。"
    singular="服务项目"
    endpoint="/api/admin/services"
    :fields="fields"
    :columns="columns"
    :status-options="statusOptions"
    :defaults="{ status: 'ENABLED', sortOrder: 0, isFeatured: false, features: [], processSteps: [] }"
  />
</template>
