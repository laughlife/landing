<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const articleId = computed(() => String(route.params.id))
</script>

<template>
  <AdminContentArticleEditor :article-id="articleId" />
</template>
