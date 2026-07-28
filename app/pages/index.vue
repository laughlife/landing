<script setup lang="ts">
import type { HomeData } from '~/composables/usePublicApi'

definePageMeta({ layout: 'default' })

const { request } = usePublicApi()
const siteOrigin = usePublicSiteOrigin()
const route = useRoute()
const { data, pending, error } = await useAsyncData('public:home', () => request<HomeData>('/api/public/home'))

const company = computed(() => data.value?.company)
const banner = computed(() => data.value?.banners?.[0])
const products = computed(() => data.value?.products ?? data.value?.featuredProducts ?? [])
const partners = computed(() => data.value?.partners ?? data.value?.featuredPartners ?? [])
const articles = computed(() => data.value?.articles ?? data.value?.latestArticles ?? [])
const cooperationSteps = computed(() => (data.value?.services ?? []).flatMap(service => service.processSteps ?? []).slice(0, 4))
const canonical = computed(() => new URL(route.path, siteOrigin.value).toString())
const title = computed(() => data.value?.site?.siteTitle || company.value?.companyName || '南阳市吴月商贸行')
const description = computed(() => data.value?.site?.siteDescription || company.value?.introduction || company.value?.slogan || '南阳市吴月商贸行，专注提供可靠的商贸产品与合作服务。')

useSeoMeta({
  title,
  description,
  keywords: computed(() => data.value?.site?.siteKeywords),
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogImage: computed(() => banner.value?.image || company.value?.logo || '/wuyue.png'),
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: computed(() => banner.value?.image || company.value?.logo || '/wuyue.png')
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: company.value
    ? [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          'name': company.value.companyName,
          'url': siteOrigin.value,
          'logo': company.value.logo,
          'telephone': company.value.phone,
          'email': company.value.email,
          'address': company.value.address
        })
      }, {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          'name': data.value?.site?.siteName || company.value.companyName,
          'url': siteOrigin.value
        })
      }]
    : []
}))
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden border-b border-default">
      <div class="absolute inset-0 -z-10 bg-muted" />
      <picture
        v-if="banner?.image"
        class="absolute inset-0 -z-10 size-full object-cover opacity-25"
      >
        <source
          v-if="banner.mobileImage"
          media="(max-width: 640px)"
          :srcset="banner.mobileImage"
        >
        <img
          :src="banner.image"
          :alt="banner.title"
          class="size-full object-cover"
          fetchpriority="high"
        >
      </picture>
      <GradientGlow class="top-0 h-full w-full opacity-80" />
      <div class="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:py-36">
        <div>
          <p class="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
            {{ company?.shortName || '吴月商贸' }}
          </p>
          <h1
            v-if="banner?.title || company?.heroTitle || company?.companyName"
            class="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl lg:text-6xl"
          >
            {{ banner?.title || company?.heroTitle || company?.companyName }}
          </h1>
          <p
            v-if="banner?.subtitle || company?.heroSubtitle || company?.slogan"
            class="mt-6 max-w-2xl text-lg leading-8 text-toned"
          >
            {{ banner?.subtitle || company?.heroSubtitle || company?.slogan }}
          </p>
          <div class="mt-9 flex flex-wrap gap-3">
            <UButton
              :label="banner?.buttonText || '查看产品中心'"
              :to="banner?.buttonLink || '/products'"
              size="xl"
            />
            <UButton
              label="咨询合作"
              to="/contact"
              color="neutral"
              variant="soft"
              size="xl"
            />
          </div>
        </div>
        <div class="rounded-2xl border border-white/20 bg-default/70 p-6 shadow-2xl backdrop-blur sm:p-8">
          <p class="text-sm font-medium text-primary">
            专业 · 可靠 · 长期合作
          </p>
          <p
            v-if="company?.introduction"
            class="mt-4 text-xl leading-8 text-highlighted"
          >
            {{ company.introduction }}
          </p>
          <NuxtLink
            to="/about"
            class="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary"
          >了解公司 <UIcon
            name="i-lucide-arrow-right"
            class="size-4"
          /></NuxtLink>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl space-y-20 px-6 py-20 sm:px-8 sm:py-28 lg:space-y-28">
      <SiteLoadState
        :pending="pending"
        :error="error"
      />
      <template v-if="data && !pending && !error">
        <section>
          <SectionHeading
            eyebrow="服务能力"
            title="以专业服务，连接每一次合作"
            :description="company?.businessScope || '聚焦商贸服务的核心环节，以清晰流程和可靠响应支持客户的业务需求。'"
          />
          <div
            v-if="data.services?.length"
            class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <ServiceCard
              v-for="service in data.services"
              :key="service.id"
              :service="service"
            />
          </div>
          <SiteEmptyState
            v-else
            class="mt-10"
            title="服务项目正在更新"
          />
        </section>

        <section>
          <SectionHeading
            eyebrow="产品分类"
            title="围绕需求，提供清晰的产品选择"
            description="从分类浏览到产品详情，帮助您快速找到合适的产品信息。"
          />
          <div
            v-if="data.categories?.length"
            class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <CategoryCard
              v-for="category in data.categories"
              :key="category.id"
              :category="category"
            />
          </div>
          <SiteEmptyState
            v-else
            class="mt-10"
            title="产品分类正在更新"
          />
        </section>

        <section>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="推荐产品"
              title="重点推荐产品"
              description="展示已发布的重点产品信息，便于您进一步了解与咨询。"
              align="left"
            />
            <UButton
              label="全部产品"
              to="/products"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-arrow-right"
            />
          </div>
          <div
            v-if="products.length"
            class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
            />
          </div>
          <SiteEmptyState
            v-else
            class="mt-10"
            title="暂无推荐产品"
          />
        </section>

        <section class="rounded-3xl border border-default bg-elevated px-6 py-12 sm:px-10">
          <SectionHeading
            eyebrow="合作优势"
            title="让每一次合作更有确定性"
            :description="company?.fullDescription || '从需求沟通、产品匹配到持续服务，我们重视每一个可被验证的合作细节。'"
          />
          <ul
            v-if="company?.advantages?.length"
            class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <li
              v-for="advantage in company.advantages"
              :key="advantage"
              class="flex gap-3 rounded-xl bg-default p-4 text-sm leading-6 text-toned"
            >
              <UIcon
                name="i-lucide-circle-check"
                class="mt-0.5 size-5 shrink-0 text-primary"
              />{{ advantage }}
            </li>
          </ul>
        </section>

        <section v-if="cooperationSteps.length">
          <SectionHeading
            eyebrow="合作流程"
            title="清晰推进每一步合作"
            description="从需求确认到持续支持，以透明流程提高沟通与交付效率。"
          />
          <ol class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <li
              v-for="(step, index) in cooperationSteps"
              :key="`${index}-${step.title}`"
              class="rounded-2xl border border-default bg-elevated p-6"
            >
              <span class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{{ index + 1 }}</span>
              <h3 class="mt-5 font-semibold text-highlighted">
                {{ step.title }}
              </h3>
              <p
                v-if="step.description"
                class="mt-2 text-sm leading-6 text-toned"
              >
                {{ step.description }}
              </p>
            </li>
          </ol>
        </section>

        <section>
          <SectionHeading
            eyebrow="合作伙伴"
            title="与优秀伙伴共同成长"
            description="感谢每一位合作伙伴的信任与支持。"
          />
          <div
            v-if="partners.length"
            class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <PartnerCard
              v-for="partner in partners"
              :key="partner.id"
              :partner="partner"
            />
          </div>
          <SiteEmptyState
            v-else
            class="mt-10"
            title="合作伙伴信息正在更新"
          />
        </section>

        <section>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="公司动态"
              title="了解最新动态"
              description="持续分享公司信息与行业资讯。"
              align="left"
            />
            <UButton
              label="全部资讯"
              to="/news"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-arrow-right"
            />
          </div>
          <div
            v-if="articles.length"
            class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <ArticleCard
              v-for="article in articles"
              :key="article.id"
              :article="article"
            />
          </div>
          <SiteEmptyState
            v-else
            class="mt-10"
            title="暂无公司动态"
          />
        </section>

        <section
          v-if="company?.address || company?.phone || company?.email || company?.workingHours"
          class="rounded-3xl border border-default bg-elevated px-6 py-10 sm:px-10"
        >
          <SectionHeading
            eyebrow="联系方式"
            title="随时欢迎您的咨询"
            align="left"
          />
          <dl class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div v-if="company.address">
              <dt class="text-sm text-dimmed">
                公司地址
              </dt>
              <dd class="mt-2 leading-6 text-toned">
                {{ company.address }}
              </dd>
            </div>
            <div v-if="company.phone">
              <dt class="text-sm text-dimmed">
                联系电话
              </dt>
              <dd class="mt-2">
                <a
                  class="text-toned hover:text-primary"
                  :href="`tel:${company.phone}`"
                >{{ company.phone }}</a>
              </dd>
            </div>
            <div v-if="company.email">
              <dt class="text-sm text-dimmed">
                电子邮箱
              </dt>
              <dd class="mt-2">
                <a
                  class="text-toned hover:text-primary"
                  :href="`mailto:${company.email}`"
                >{{ company.email }}</a>
              </dd>
            </div>
            <div v-if="company.workingHours">
              <dt class="text-sm text-dimmed">
                工作时间
              </dt>
              <dd class="mt-2 text-toned">
                {{ company.workingHours }}
              </dd>
            </div>
          </dl>
        </section>
      </template>
    </div>

    <section class="border-y border-default bg-elevated">
      <div class="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-14 sm:px-8 md:flex-row md:items-center">
        <div>
          <p class="text-sm font-semibold tracking-[0.18em] text-primary uppercase">
            联系我们
          </p><h2 class="mt-3 text-3xl font-semibold tracking-tight text-highlighted">
            期待与您展开合作
          </h2><p class="mt-3 text-dimmed">
            有产品或服务需求，欢迎与我们取得联系。
          </p>
        </div>
        <UButton
          label="提交咨询"
          to="/contact"
          size="xl"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </section>
  </div>
</template>
