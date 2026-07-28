<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <NuxtLink
    to="/admin"
    class="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    aria-label="返回管理后台控制台"
  >
    <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-inverted shadow-sm">
      <UIcon
        name="i-lucide-panels-top-left"
        class="size-5"
      />
    </span>
    <span
      v-if="!collapsed"
      class="min-w-0"
    >
      <span class="block truncate text-sm font-semibold text-highlighted">网站管理后台</span>
      <span class="block truncate text-xs text-muted">南阳市吴月商贸行</span>
    </span>
  </NuxtLink>
</template>
