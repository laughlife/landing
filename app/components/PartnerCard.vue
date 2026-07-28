<script setup lang="ts">
import type { Partner } from '~/composables/usePublicApi'

const props = defineProps<{ partner: Partner }>()
const logoImage = computed(() => publicImageVariant(props.partner.logo, 'thumb'))
</script>

<template>
  <article class="rounded-2xl border border-default bg-elevated p-5">
    <div class="flex min-h-20 items-center justify-center rounded-xl bg-default p-4">
      <img
        v-if="partner.logo"
        :src="logoImage"
        :alt="partner.name"
        class="max-h-12 max-w-full object-contain"
        loading="lazy"
        decoding="async"
        width="320"
        height="96"
      >
      <span
        v-else
        class="text-center text-sm font-medium text-dimmed"
      >{{ partner.name }}</span>
    </div>
    <p
      v-if="partner.cooperationType"
      class="mt-4 text-xs font-medium tracking-wide text-primary"
    >
      {{ partner.cooperationType }}
    </p>
    <h3 class="mt-1 font-semibold text-highlighted">
      {{ partner.name }}
    </h3>
    <p
      v-if="partner.summary"
      class="mt-2 line-clamp-3 text-sm leading-6 text-dimmed"
    >
      {{ partner.summary }}
    </p>
    <a
      v-if="partner.website"
      :href="partner.website"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
    >访问官网 <UIcon
      name="i-lucide-external-link"
      class="size-4"
    /></a>
  </article>
</template>
