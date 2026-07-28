<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
  actionLabel?: string
}>(), {
  icon: 'i-lucide-inbox',
  description: undefined,
  actionLabel: undefined
})

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center">
    <span class="grid size-12 place-items-center rounded-full bg-elevated text-muted">
      <UIcon
        :name="icon"
        class="size-6"
      />
    </span>
    <h3 class="mt-4 text-sm font-semibold text-highlighted">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="mt-1 max-w-sm text-sm text-muted"
    >
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel"
      class="mt-5"
      color="neutral"
      variant="outline"
      icon="i-lucide-refresh-cw"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </UButton>
  </div>
</template>
