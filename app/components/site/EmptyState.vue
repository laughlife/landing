<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  icon?: string
}>(), {
  title: '暂无内容',
  description: '相关内容正在整理中，敬请关注。',
  icon: 'i-lucide-inbox'
})
</script>

<template>
  <div class="rounded-2xl border border-dashed border-default px-6 py-14 text-center">
    <UIcon
      :name="icon"
      class="mx-auto size-8 text-dimmed"
    />
    <h3 class="mt-4 font-medium text-highlighted">
      {{ title }}
    </h3>
    <p class="mt-2 text-sm text-dimmed">
      {{ description }}
    </p>
  </div>
</template>
