<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
}>(), {
  eyebrow: undefined,
  description: undefined,
  align: 'center'
})
</script>

<template>
  <div
    :class="align === 'center' ? 'mx-auto text-center' : 'text-left'"
    class="max-w-3xl"
  >
    <p
      v-if="eyebrow"
      class="mb-3 text-xs font-semibold tracking-[0.18em] text-primary uppercase"
    >
      {{ eyebrow }}
    </p>
    <h2 class="text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
      {{ title }}
    </h2>
    <p
      v-if="description"
      class="mt-4 text-base leading-7 text-dimmed sm:text-lg"
    >
      {{ description }}
    </p>
  </div>
</template>
