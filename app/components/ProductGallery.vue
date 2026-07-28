<script setup lang="ts">
import type { ProductImage } from '~/composables/usePublicApi'

const props = defineProps<{
  name: string
  coverImage?: string
  images?: ProductImage[]
}>()

const activeIndex = ref(0)
const galleryImages = computed(() => {
  const images = props.images ?? []
  if (props.coverImage && !images.some(image => image.imageUrl === props.coverImage)) {
    return [{ id: 'cover', imageUrl: props.coverImage, altText: props.name }, ...images]
  }
  return images
})

const activeImage = computed(() => galleryImages.value[activeIndex.value])
</script>

<template>
  <div>
    <div class="relative aspect-square overflow-hidden rounded-2xl bg-muted">
      <img
        v-if="activeImage"
        :src="activeImage.imageUrl"
        :alt="activeImage.altText || name"
        class="size-full object-cover"
      >
      <UIcon
        v-else
        name="i-lucide-package-search"
        class="absolute inset-0 m-auto size-14 text-dimmed"
      />
    </div>
    <div
      v-if="galleryImages.length > 1"
      class="mt-3 flex gap-3 overflow-x-auto pb-1"
    >
      <button
        v-for="(image, index) in galleryImages"
        :key="image.id"
        type="button"
        :aria-label="`查看${name}图片 ${index + 1}`"
        :class="index === activeIndex ? 'ring-2 ring-primary' : 'ring-1 ring-default'"
        class="size-18 shrink-0 overflow-hidden rounded-lg bg-muted"
        @click="activeIndex = index"
      >
        <img
          :src="publicImageVariant(image.imageUrl, 'thumb')"
          :alt="image.altText || name"
          class="size-full object-cover"
          loading="lazy"
          decoding="async"
          width="320"
          height="320"
        >
      </button>
    </div>
  </div>
</template>
