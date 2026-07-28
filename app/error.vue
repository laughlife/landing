<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const title = computed(() => props.error.statusCode === 404 ? '页面未找到' : '页面暂时无法打开')
const description = computed(() => props.error.statusCode === 404 ? '您访问的内容可能已变更或不存在。' : '请稍后重试，或返回首页继续浏览。')

useSeoMeta({ title: title, robots: 'noindex, nofollow' })
</script>

<template>
  <UApp>
    <main class="grid min-h-screen place-items-center bg-default px-6 text-center">
      <div class="max-w-md">
        <AppLogo class="mx-auto size-16 rounded-xl object-contain" /><p class="mt-8 text-sm font-semibold tracking-[0.2em] text-primary">
          {{ error.statusCode || 500 }}
        </p><h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted">
          {{ title }}
        </h1><p class="mt-4 leading-7 text-dimmed">
          {{ description }}
        </p><div class="mt-8 flex justify-center gap-3">
          <UButton
            label="返回首页"
            to="/"
            @click="clearError({ redirect: '/' })"
          /><UButton
            label="上一页"
            color="neutral"
            variant="soft"
            @click="clearError()"
          />
        </div>
      </div>
    </main>
  </UApp>
</template>
