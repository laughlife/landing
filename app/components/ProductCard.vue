<script setup lang="ts">
import type { Product } from '~/composables/usePublicApi'

const props = defineProps<{ product: Product }>()
const cardImage = computed(() => publicImageVariant(props.product.coverImage, 480))
</script>

<template>
  <NuxtLink
    :to="`/products/${product.slug}`"
    class="group block overflow-hidden rounded-2xl border border-default bg-elevated transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg"
  >
    <div class="relative aspect-[4/3] overflow-hidden bg-muted">
      <SiteImage
        :src="cardImage"
        :original-src="product.coverImage"
        :alt="product.name"
        class="size-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        width="480"
        height="360"
      />
      <UBadge
        v-if="product.category?.name"
        color="neutral"
        variant="soft"
        class="absolute top-3 left-3 bg-default/90 backdrop-blur"
      >{{ product.category.name }}</UBadge>
    </div>
    <div class="p-5">
      <p
        v-if="product.model"
        class="text-xs tracking-wide text-dimmed"
      >型号：{{ product.model }}</p>
      <h3 class="mt-1 font-semibold text-highlighted">{{ product.name }}</h3>
      <p
        v-if="product.summary || product.subtitle"
        class="mt-2 line-clamp-2 text-sm leading-6 text-dimmed"
      >{{ product.summary || product.subtitle }}</p>
      <span class="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">查看详情 <UIcon
        name="i-lucide-arrow-right"
        class="size-4 transition group-hover:translate-x-0.5"
      /></span>
    </div>
  </NuxtLink>
</template>
