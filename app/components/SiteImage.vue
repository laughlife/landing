<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  src?: string | null
  originalSrc?: string | null
  fallbackSrc?: string | null
  resetKey?: string | number | boolean | null
  alt: string
}>()

const emit = defineEmits<{
  fallback: [src: string]
}>()

const configuredFallback = usePublicFallbackImage()
const candidateIndex = ref(0)
const exhausted = ref(false)
const candidates = computed(() => {
  const values = [
    props.src,
    props.originalSrc,
    props.fallbackSrc,
    configuredFallback.value,
    PUBLIC_FALLBACK_IMAGE
  ].filter((value): value is string => Boolean(value))

  return [...new Set(values)]
})
const currentSrc = computed(() => candidates.value[candidateIndex.value] || PUBLIC_FALLBACK_IMAGE)

function resetCandidates() {
  candidateIndex.value = 0
  exhausted.value = false
}

watch(candidates, resetCandidates)
watch(() => props.resetKey, resetCandidates)

function useNextCandidate() {
  if (exhausted.value) return

  if (candidateIndex.value < candidates.value.length - 1) {
    candidateIndex.value += 1
    emit('fallback', currentSrc.value)
    return
  }

  exhausted.value = true
}
</script>

<template>
  <img
    v-bind="$attrs"
    :src="currentSrc"
    :alt="alt"
    @error="useNextCandidate"
  >
</template>
