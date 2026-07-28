<script setup lang="ts">
/* eslint-disable vue/no-v-html -- Rich text is sanitized by the public API before rendering. */
import type { ServiceItem } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const slug = computed(() => String(route.params.slug))
const { data: service } = await useAsyncData(() => `public:service:${slug.value}`, () => request<ServiceItem>(`/api/public/services/${encodeURIComponent(slug.value)}`), { watch: [slug] })
if (!service.value) throw createError({ statusCode: 404, statusMessage: '服务项目不存在' })

const canonical = computed(() => new URL(route.path, siteOrigin.value).toString())
const title = computed(() => service.value?.seoTitle || service.value?.name || '服务项目')
const description = computed(() => service.value?.seoDescription || service.value?.summary || '')
const fallbackImage = usePublicFallbackImage()
useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: canonical, ogImage: computed(() => service.value?.coverImage || fallbackImage.value), twitterTitle: title, twitterDescription: description, twitterImage: computed(() => service.value?.coverImage || fallbackImage.value) })
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: service.value
    ? [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': new URL('/', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 2, 'name': '服务项目', 'item': new URL('/services', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 3, 'name': service.value.name, 'item': canonical.value }
          ]
        })
      }]
    : []
}))
</script>

<template>
  <div
    v-if="service"
    class="mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-16"
  >
    <nav
      class="mb-8 flex items-center gap-2 text-sm text-dimmed"
      aria-label="面包屑"
    >
      <NuxtLink to="/">首页</NuxtLink><UIcon
        name="i-lucide-chevron-right"
        class="size-4"
      /><NuxtLink to="/services">服务项目</NuxtLink><UIcon
        name="i-lucide-chevron-right"
        class="size-4"
      /><span class="text-toned">{{ service.name }}</span>
    </nav>
    <section class="overflow-hidden rounded-3xl border border-default bg-elevated">
      <SiteImage
        :src="service.coverImage"
        :alt="service.name"
        class="aspect-[2/1] w-full object-cover"
      />
      <div class="p-7 sm:p-10">
        <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UIcon
            :name="service.icon || 'i-lucide-briefcase-business'"
            class="size-6"
          />
        </div><h1 class="mt-5 text-4xl font-semibold tracking-tight text-highlighted">
          {{ service.name }}
        </h1><p
          v-if="service.summary"
          class="mt-4 text-lg leading-8 text-toned"
        >
          {{ service.summary }}
        </p>
      </div>
    </section>
    <section
      v-if="service.features?.length"
      class="mt-14"
    >
      <SectionHeading
        title="服务优势"
        align="left"
      /><ul class="mt-6 grid gap-4 sm:grid-cols-2">
        <li
          v-for="feature in service.features"
          :key="feature"
          class="flex gap-3 rounded-xl border border-default p-5 text-sm leading-6 text-toned"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="mt-0.5 size-5 shrink-0 text-primary"
          />{{ feature }}
        </li>
      </ul>
    </section>
    <section
      v-if="service.processSteps?.length"
      class="mt-14"
    >
      <SectionHeading
        title="合作流程"
        align="left"
      /><ol class="mt-7 space-y-4">
        <li
          v-for="(step, index) in service.processSteps"
          :key="`${index}-${step.title}`"
          class="flex gap-4 rounded-xl border border-default bg-elevated p-5"
        >
          <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{{ index + 1 }}</span>
          <div>
            <h3 class="font-medium text-highlighted">
              {{ step.title }}
            </h3>
            <p
              v-if="step.description"
              class="mt-1 text-sm leading-6 text-toned"
            >
              {{ step.description }}
            </p>
          </div>
        </li>
      </ol>
    </section>
    <section
      v-if="service.description"
      class="mt-14"
    >
      <SectionHeading
        title="服务介绍"
        align="left"
      /><!-- eslint-disable-next-line vue/no-v-html --><div
        class="rich-content mt-6 leading-8 text-toned"
        v-html="service.description"
      />
    </section>
    <section class="mt-16 rounded-2xl border border-default bg-elevated p-7 sm:flex sm:items-center sm:justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-highlighted">
          需要这项服务？
        </h2><p class="mt-2 text-dimmed">
          欢迎提交咨询，我们会尽快回复您。
        </p>
      </div><UButton
        class="mt-5 sm:mt-0"
        label="咨询合作"
        to="/contact"
        size="lg"
      />
    </section>
  </div>
</template>
