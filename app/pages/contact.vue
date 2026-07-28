<script setup lang="ts">
import type { CompanyProfile } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const route = useRoute()
const siteOrigin = usePublicSiteOrigin()
const { request } = usePublicApi()
const { data: company, pending, error } = await useAsyncData('public:company-contact', () => request<CompanyProfile>('/api/public/company'))
const canonical = computed(() => new URL('/contact', siteOrigin.value).toString())
useSeoMeta({ title: '联系我们', description: computed(() => company.value?.introduction || '欢迎联系南阳市吴月商贸行，提交您的产品或服务咨询。'), ogUrl: canonical })
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))

const productId = computed(() => typeof route.query.productId === 'string' ? route.query.productId : undefined)
const productName = computed(() => typeof route.query.product === 'string' ? route.query.product : undefined)
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SectionHeading
      eyebrow="联系我们"
      title="期待听见您的需求"
      description="无论是产品信息、服务合作还是其他咨询，欢迎留下联系方式，我们会尽快回复。"
    />
    <SiteLoadState
      class="mt-10"
      :pending="pending"
      :error="error"
    />
    <div
      v-if="!pending && !error"
      class="mt-10 grid gap-8 lg:grid-cols-[.8fr_1.2fr]"
    >
      <aside class="rounded-2xl border border-default bg-elevated p-6 sm:p-8">
        <h2 class="text-xl font-semibold text-highlighted">
          联系信息
        </h2>
        <dl class="mt-7 space-y-6">
          <div
            v-if="company?.address"
            class="flex gap-3"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="mt-0.5 size-5 shrink-0 text-primary"
            /><div>
              <dt class="text-sm text-dimmed">
                公司地址
              </dt><dd class="mt-1 leading-6 text-toned">
                {{ company.address }}
              </dd>
            </div>
          </div>
          <div
            v-if="company?.phone"
            class="flex gap-3"
          >
            <UIcon
              name="i-lucide-phone"
              class="mt-0.5 size-5 shrink-0 text-primary"
            /><div>
              <dt class="text-sm text-dimmed">
                联系电话
              </dt><dd class="mt-1">
                <a
                  :href="`tel:${company.phone}`"
                  class="text-toned hover:text-primary"
                >{{ company.phone }}</a>
              </dd>
            </div>
          </div>
          <div
            v-if="company?.email"
            class="flex gap-3"
          >
            <UIcon
              name="i-lucide-mail"
              class="mt-0.5 size-5 shrink-0 text-primary"
            /><div>
              <dt class="text-sm text-dimmed">
                电子邮箱
              </dt><dd class="mt-1">
                <a
                  :href="`mailto:${company.email}`"
                  class="text-toned hover:text-primary"
                >{{ company.email }}</a>
              </dd>
            </div>
          </div>
          <div
            v-if="company?.workingHours"
            class="flex gap-3"
          >
            <UIcon
              name="i-lucide-clock-3"
              class="mt-0.5 size-5 shrink-0 text-primary"
            /><div>
              <dt class="text-sm text-dimmed">
                工作时间
              </dt><dd class="mt-1 text-toned">
                {{ company.workingHours }}
              </dd>
            </div>
          </div>
        </dl>
        <div class="mt-8 flex min-h-48 items-center justify-center rounded-xl border border-dashed border-default bg-default p-6 text-center text-sm leading-6 text-dimmed">
          <UIcon
            name="i-lucide-map"
            class="mr-2 size-5 text-primary"
          />地图位置将根据公司地址展示
        </div>
      </aside>
      <section class="rounded-2xl border border-default bg-elevated p-6 sm:p-8">
        <p
          v-if="productName"
          class="mb-4 rounded-lg bg-primary/10 px-4 py-3 text-sm text-toned"
        >
          本次咨询将关联产品：<span class="font-medium text-highlighted">{{ productName }}</span>
        </p>
        <h2 class="text-xl font-semibold text-highlighted">
          提交咨询
        </h2>
        <p class="mt-2 text-sm leading-6 text-dimmed">
          标有必填项的信息将仅用于回复本次咨询。
        </p>
        <ContactForm
          class="mt-7"
          source-page="/contact"
          :product-id="productId"
          :subject="productName ? `咨询产品：${productName}` : undefined"
        />
      </section>
    </div>
  </div>
</template>
