<script setup lang="ts">
defineProps<{
  pending?: boolean
  error?: Error | null
}>()
</script>

<template>
  <div
    v-if="pending"
    class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    <USkeleton
      v-for="item in 3"
      :key="item"
      class="h-64 rounded-2xl"
    />
  </div>
  <UAlert
    v-else-if="error"
    color="error"
    variant="soft"
    title="内容加载失败"
    :description="error.message || '请稍后刷新页面重试。'"
    icon="i-lucide-circle-alert"
  />
</template>
