<script setup lang="ts">
import type { ServiceItem } from '~/composables/usePublicApi'

defineProps<{ service: ServiceItem }>()
</script>

<template>
  <NuxtLink
    :to="`/services/${service.slug}`"
    class="group flex h-full flex-col rounded-2xl border border-default bg-elevated p-6 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
  >
    <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <UIcon
        :name="service.icon || 'i-lucide-briefcase-business'"
        class="size-5"
        aria-hidden="true"
      />
    </div>
    <h3 class="mt-5 font-semibold text-highlighted">{{ service.name }}</h3>
    <p
      v-if="service.summary"
      class="mt-2 flex-1 text-sm leading-6 text-dimmed"
    >{{ service.summary }}</p>
    <span class="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">了解服务 <UIcon
      name="i-lucide-arrow-right"
      class="size-4 transition group-hover:translate-x-0.5"
    /></span>
  </NuxtLink>
</template>
