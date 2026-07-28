<script setup lang="ts">
/* eslint-disable vue/no-v-html -- Rich text is sanitized by the public API before rendering. */
import type { Product } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const toast = useToast()
const slug = computed(() => String(route.params.slug))
const { data: product } = await useAsyncData(() => `public:product:${slug.value}`, () => request<Product>(`/api/public/products/${encodeURIComponent(slug.value)}`), { watch: [slug] })

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: '产品不存在' })
}

const canonical = computed(() => new URL(route.path, siteOrigin.value).toString())
const title = computed(() => product.value?.seoTitle || product.value?.name || '产品详情')
const description = computed(() => product.value?.seoDescription || product.value?.summary || product.value?.subtitle || '')
useSeoMeta({
  title,
  description,
  keywords: computed(() => product.value?.seoKeywords),
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogImage: computed(() => product.value?.coverImage),
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: computed(() => product.value?.coverImage)
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: product.value
    ? [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          'name': product.value.name,
          'description': description.value,
          'image': product.value.coverImage ? [new URL(product.value.coverImage, siteOrigin.value).toString()] : undefined,
          'sku': product.value.model
        })
      }, {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          'itemListElement': [
            { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': new URL('/', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 2, 'name': '产品中心', 'item': new URL('/products', siteOrigin.value).toString() },
            { '@type': 'ListItem', 'position': 3, 'name': product.value.name, 'item': canonical.value }
          ]
        })
      }]
    : []
}))

async function shareProduct() {
  if (!product.value || import.meta.server) return
  const shareData = { title: product.value.name, text: description.value, url: canonical.value }
  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(canonical.value)
      toast.add({ title: '链接已复制', color: 'success' })
    }
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') toast.add({ title: '分享失败，请复制浏览器地址', color: 'warning' })
  }
}
</script>

<template>
  <div
    v-if="product"
    class="mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-16"
  >
    <nav
      class="mb-8 flex flex-wrap items-center gap-2 text-sm text-dimmed"
      aria-label="面包屑"
    >
      <NuxtLink to="/">首页</NuxtLink><UIcon
        name="i-lucide-chevron-right"
        class="size-4"
      /><NuxtLink to="/products">产品中心</NuxtLink><UIcon
        name="i-lucide-chevron-right"
        class="size-4"
      /><span class="text-toned">{{ product.name }}</span>
    </nav>
    <div class="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <ProductGallery
        :name="product.name"
        :cover-image="product.coverImage"
        :images="product.images"
      />
      <div>
        <p
          v-if="product.category?.name"
          class="text-sm font-medium text-primary"
        >
          {{ product.category.name }}
        </p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted sm:text-4xl">
          {{ product.name }}
        </h1>
        <p
          v-if="product.model"
          class="mt-3 text-sm text-dimmed"
        >
          型号：{{ product.model }}
        </p>
        <p
          v-if="product.summary || product.subtitle"
          class="mt-6 text-lg leading-8 text-toned"
        >
          {{ product.summary || product.subtitle }}
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <UButton
            label="产品咨询"
            :to="{ path: '/contact', query: { productId: product.id, product: product.name } }"
            size="lg"
          />
          <UButton
            label="分享产品"
            icon="i-lucide-share-2"
            color="neutral"
            variant="soft"
            size="lg"
            @click="shareProduct"
          />
          <UButton
            label="返回产品中心"
            to="/products"
            color="neutral"
            variant="soft"
            size="lg"
          />
        </div>
      </div>
    </div>

    <div class="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div class="space-y-12">
        <section v-if="product.features?.length">
          <h2 class="text-2xl font-semibold text-highlighted">
            产品特点
          </h2><ul class="mt-5 grid gap-3 sm:grid-cols-2">
            <li
              v-for="feature in product.features"
              :key="feature"
              class="flex gap-3 rounded-xl border border-default p-4 text-sm leading-6 text-toned"
            >
              <UIcon
                name="i-lucide-circle-check"
                class="mt-0.5 size-5 shrink-0 text-primary"
              />{{ feature }}
            </li>
          </ul>
        </section>
        <section v-if="product.applications?.length">
          <h2 class="text-2xl font-semibold text-highlighted">
            应用场景
          </h2><div class="mt-5 flex flex-wrap gap-3">
            <UBadge
              v-for="application in product.applications"
              :key="application"
              color="neutral"
              variant="soft"
              size="lg"
            >
              {{ application }}
            </UBadge>
          </div>
        </section>
        <section v-if="product.specifications?.length">
          <h2 class="text-2xl font-semibold text-highlighted">
            规格参数
          </h2><div class="mt-5 space-y-6">
            <div
              v-for="group in product.specifications"
              :key="group.group"
              class="overflow-x-auto rounded-xl border border-default"
            >
              <h3 class="border-b border-default bg-elevated px-5 py-3 font-medium text-highlighted">
                {{ group.group }}
              </h3><table class="w-full min-w-100 text-sm">
                <tbody>
                  <tr
                    v-for="item in group.items"
                    :key="item.label"
                    class="border-b border-default last:border-0"
                  >
                    <th
                      scope="row"
                      class="w-1/3 bg-elevated px-5 py-3 text-left font-medium text-toned"
                    >
                      {{ item.label }}
                    </th><td class="px-5 py-3 text-dimmed">
                      {{ item.value }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section v-if="product.description">
          <h2 class="text-2xl font-semibold text-highlighted">
            详细介绍
          </h2><!-- eslint-disable-next-line vue/no-v-html --><div
            class="rich-content mt-5 leading-8 text-toned"
            v-html="product.description"
          />
        </section>
      </div>
      <aside class="h-fit rounded-2xl border border-default bg-elevated p-6">
        <h2 class="font-semibold text-highlighted">
          需要更多信息？
        </h2><p class="mt-3 text-sm leading-6 text-dimmed">
          提交咨询后，我们会根据您的需求及时联系。
        </p><UButton
          class="mt-5"
          label="立即咨询"
          :to="{ path: '/contact', query: { productId: product.id, product: product.name } }"
          block
        />
      </aside>
    </div>

    <section
      v-if="product.relatedProducts?.length"
      class="mt-20"
    >
      <SectionHeading
        eyebrow="相关推荐"
        title="您可能还想了解"
      /><div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard
          v-for="related in product.relatedProducts"
          :key="related.id"
          :product="related"
        />
      </div>
    </section>
  </div>
</template>
