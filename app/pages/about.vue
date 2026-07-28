<script setup lang="ts">
/* eslint-disable vue/no-v-html -- Rich text is sanitized by the public API before rendering. */
import type { CompanyProfile } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const { request } = usePublicApi()
const siteOrigin = usePublicSiteOrigin()
const { data: company, pending, error } = await useAsyncData('public:company', () => request<CompanyProfile>('/api/public/company'))
const canonical = computed(() => new URL('/about', siteOrigin.value).toString())
const title = computed(() => company.value?.companyName ? `公司介绍｜${company.value.companyName}` : '公司介绍')
const description = computed(() => company.value?.introduction || company.value?.slogan || '了解南阳市吴月商贸行的公司信息、业务范围和服务理念。')
const fallbackImage = usePublicFallbackImage()
useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: canonical, ogImage: computed(() => company.value?.logo || fallbackImage.value) })
useHead(() => ({ link: [{ rel: 'canonical', href: canonical.value }] }))
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-14 sm:px-8 sm:py-20">
    <SiteLoadState
      :pending="pending"
      :error="error"
    />
    <template v-if="company && !pending && !error">
      <section class="grid gap-10 rounded-3xl border border-default bg-elevated p-7 sm:p-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center">
        <div class="flex aspect-square items-center justify-center rounded-2xl bg-default p-10">
          <SiteImage
            :src="company.logo"
            :alt="company.companyName"
            class="max-h-full max-w-full object-contain"
          />
        </div>
        <div>
          <p class="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
            公司介绍
          </p><h1 class="mt-4 text-4xl font-semibold tracking-tight text-highlighted">
            {{ company.companyName }}
          </h1><p
            v-if="company.slogan"
            class="mt-4 text-xl leading-8 text-toned"
          >
            {{ company.slogan }}
          </p><p
            v-if="company.introduction"
            class="mt-6 leading-8 text-dimmed"
          >
            {{ company.introduction }}
          </p>
        </div>
      </section>

      <section class="mt-20 grid gap-12 lg:grid-cols-[1.25fr_.75fr]">
        <div class="space-y-10">
          <div v-if="company.fullDescription">
            <SectionHeading
              title="企业定位与发展理念"
              align="left"
            /><!-- eslint-disable-next-line vue/no-v-html --><div
              class="rich-content mt-5 leading-8 text-toned"
              v-html="company.fullDescription"
            />
          </div>
          <div v-if="company.businessScope">
            <SectionHeading
              title="业务范围"
              align="left"
            /><!-- eslint-disable-next-line vue/no-v-html --><div
              class="rich-content mt-5 leading-8 text-toned"
              v-html="company.businessScope"
            />
          </div>
        </div>
        <aside class="h-fit rounded-2xl border border-default bg-elevated p-6">
          <h2 class="text-xl font-semibold text-highlighted">
            联系信息
          </h2><dl class="mt-5 space-y-4 text-sm">
            <div v-if="company.address">
              <dt class="text-dimmed">
                公司地址
              </dt><dd class="mt-1 leading-6 text-toned">
                {{ company.address }}
              </dd>
            </div><div v-if="company.phone">
              <dt class="text-dimmed">
                联系电话
              </dt><dd class="mt-1">
                <a
                  :href="`tel:${company.phone}`"
                  class="text-primary"
                >{{ company.phone }}</a>
              </dd>
            </div><div v-if="company.email">
              <dt class="text-dimmed">
                电子邮箱
              </dt><dd class="mt-1">
                <a
                  :href="`mailto:${company.email}`"
                  class="text-primary"
                >{{ company.email }}</a>
              </dd>
            </div><div v-if="company.workingHours">
              <dt class="text-dimmed">
                工作时间
              </dt><dd class="mt-1 text-toned">
                {{ company.workingHours }}
              </dd>
            </div>
          </dl><UButton
            class="mt-6"
            label="咨询合作"
            to="/contact"
            block
          />
        </aside>
      </section>

      <section
        v-if="company.advantages?.length"
        class="mt-20"
      >
        <SectionHeading
          eyebrow="核心优势"
          title="值得信赖的合作基础"
        /><ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="advantage in company.advantages"
            :key="advantage"
            class="rounded-2xl border border-default bg-elevated p-6"
          >
            <UIcon
              name="i-lucide-badge-check"
              class="size-6 text-primary"
            /><p class="mt-4 leading-7 text-toned">
              {{ advantage }}
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
