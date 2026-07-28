<script setup lang="ts">
const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ 'update:page': [value: number] }>()
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<template>
  <div class="flex flex-col gap-3 border-t border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
    <p class="text-sm text-muted">
      共 {{ total }} 条，第 {{ page }} / {{ pageCount }} 页
    </p>
    <div class="flex gap-2">
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-chevron-left"
        label="上一页"
        :disabled="disabled || page <= 1"
        @click="emit('update:page', page - 1)"
      />
      <UButton
        color="neutral"
        variant="outline"
        trailing-icon="i-lucide-chevron-right"
        label="下一页"
        :disabled="disabled || page >= pageCount"
        @click="emit('update:page', page + 1)"
      />
    </div>
  </div>
</template>
