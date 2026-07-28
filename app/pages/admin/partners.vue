<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '已启用', value: 'ENABLED' },
  { label: '已停用', value: 'DISABLED' }
]

const fields = [
  { key: 'name', label: '伙伴名称', required: true, placeholder: '例如：演示合作伙伴' },
  { key: 'slug', label: 'Slug', required: true, placeholder: 'partner-name' },
  { key: 'cooperationType', label: '合作类型', placeholder: '供应链合作' },
  { key: 'website', label: '官网地址', placeholder: 'https://example.com' },
  { key: 'logo', label: 'Logo 地址', placeholder: '/uploads/...' },
  { key: 'coverImage', label: '封面图地址', placeholder: '/uploads/...' },
  { key: 'summary', label: '简介', kind: 'textarea', wide: true },
  { key: 'description', label: '详细介绍', kind: 'richtext', wide: true, description: '使用富文本工具栏维护详情内容。' },
  { key: 'sortOrder', label: '排序', kind: 'number' },
  { key: 'status', label: '状态', kind: 'select', options: statusOptions.slice(1) },
  { key: 'isFeatured', label: '首页推荐', kind: 'switch' },
  { key: 'seoTitle', label: 'SEO 标题', wide: true },
  { key: 'seoDescription', label: 'SEO 描述', kind: 'textarea', wide: true }
] as const

const columns = [
  { key: 'name', label: '名称' },
  { key: 'cooperationType', label: '合作类型' },
  { key: 'sortOrder', label: '排序' },
  { key: 'status', label: '状态' },
  { key: 'updatedAt', label: '更新时间' }
]
</script>

<template>
  <AdminContentContentCrudPage
    title="合作伙伴"
    description="维护合作品牌、合作类型和官网展示信息。"
    singular="合作伙伴"
    endpoint="/api/admin/partners"
    :fields="fields"
    :columns="columns"
    :status-options="statusOptions"
    :defaults="{ status: 'ENABLED', sortOrder: 0, isFeatured: false }"
  />
</template>
