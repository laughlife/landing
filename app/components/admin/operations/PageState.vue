<script setup lang="ts">
withDefaults(defineProps<{
  loading?: boolean
  error?: string
  empty?: boolean
  emptyTitle?: string
  emptyDescription?: string
}>(), {
  loading: false,
  error: '',
  empty: false,
  emptyTitle: '暂无数据',
  emptyDescription: '当前筛选条件下没有可显示的内容。'
})

defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    v-if="loading"
    class="grid min-h-52 place-items-center rounded-xl border border-default bg-default/50"
  >
    <div class="flex items-center gap-3 text-sm text-muted">
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-primary"
      />
      正在加载数据…
    </div>
  </div>
  <UAlert
    v-else-if="error"
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    title="加载失败"
    :description="error"
    :actions="[{ label: '重新加载', onClick: () => $emit('retry') }]"
  />
  <div
    v-else-if="empty"
    class="grid min-h-52 place-items-center rounded-xl border border-dashed border-default p-8 text-center"
  >
    <div>
      <UIcon
        name="i-lucide-inbox"
        class="mx-auto mb-3 size-9 text-dimmed"
      />
      <p class="font-medium text-highlighted">
        {{ emptyTitle }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ emptyDescription }}
      </p>
    </div>
  </div>
  <slot v-else />
</template>
