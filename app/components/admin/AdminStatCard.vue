<script setup lang="ts">
defineProps<{
  label: string
  value: number
  icon: string
  description?: string
  to?: string
  tone?: 'primary' | 'info' | 'success' | 'warning' | 'neutral'
}>()

const toneClasses = {
  primary: 'bg-primary/10 text-primary',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  neutral: 'bg-elevated text-muted'
}
</script>

<template>
  <UCard :ui="{ body: 'p-5 sm:p-6' }">
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-sm text-muted">
          {{ label }}
        </p>
        <p class="mt-2 text-3xl font-semibold tracking-tight text-highlighted">
          {{ value.toLocaleString('zh-CN') }}
        </p>
        <p
          v-if="description"
          class="mt-1 truncate text-xs text-dimmed"
        >
          {{ description }}
        </p>
      </div>
      <div :class="[toneClasses[tone || 'neutral'], 'grid size-10 shrink-0 place-items-center rounded-xl']">
        <UIcon
          :name="icon"
          class="size-5"
        />
      </div>
    </div>
    <template
      v-if="to"
      #footer
    >
      <UButton
        :to="to"
        color="neutral"
        variant="link"
        trailing-icon="i-lucide-arrow-right"
        class="px-0"
      >
        查看详情
      </UButton>
    </template>
  </UCard>
</template>
