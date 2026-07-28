<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: '网站设置 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type SocialLink = { name: string, url: string }
type SettingsForm = {
  siteName: string
  siteUrl: string
  siteTitle: string
  siteKeywords: string
  siteDescription: string
  logo: string
  favicon: string
  footerText: string
  copyright: string
  icpNumber: string
  themeConfig: Record<string, unknown>
  socialLinks: SocialLink[]
  contactConfig: Record<string, unknown>
}
type ApiResponse<T> = { success: boolean, data: T, message: string }

const blank = (): SettingsForm => ({
  siteName: '', siteUrl: '', siteTitle: '', siteKeywords: '', siteDescription: '', logo: '', favicon: '',
  footerText: '', copyright: '', icpNumber: '', themeConfig: {}, socialLinks: [], contactConfig: {}
})
const form = ref(blank())
const themeJson = ref('{}')
const contactJson = ref('{}')
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)
const error = ref('')
const notice = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<Partial<SettingsForm>>>('/api/admin/site-settings')
    form.value = {
      ...blank(),
      ...response.data,
      socialLinks: Array.isArray(response.data.socialLinks)
        ? response.data.socialLinks.map(item => ({ name: item.name, url: item.url || '' }))
        : []
    }
    themeJson.value = JSON.stringify(form.value.themeConfig || {}, null, 2)
    contactJson.value = JSON.stringify(form.value.contactConfig || {}, null, 2)
    dirty.value = false
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '网站设置加载失败'
  } finally {
    loading.value = false
  }
}

function addSocialLink() {
  form.value.socialLinks.push({ name: '', url: '' })
  dirty.value = true
}

async function save() {
  if (!form.value.siteName.trim()) {
    error.value = '网站名称不能为空'
    return
  }
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    const themeConfig = JSON.parse(themeJson.value) as Record<string, unknown>
    const contactConfig = JSON.parse(contactJson.value) as Record<string, unknown>
    const payload = {
      ...form.value,
      themeConfig,
      contactConfig,
      socialLinks: form.value.socialLinks.filter(item => item.name.trim() && item.url?.trim()).map(item => ({ name: item.name.trim(), url: item.url!.trim() }))
    }
    const response = await $fetch<ApiResponse<SettingsForm>>('/api/admin/site-settings', { method: 'PUT', body: payload })
    form.value = { ...blank(), ...response.data }
    themeJson.value = JSON.stringify(form.value.themeConfig || {}, null, 2)
    contactJson.value = JSON.stringify(form.value.contactConfig || {}, null, 2)
    dirty.value = false
    notice.value = response.message || '网站设置已保存'
  } catch (reason) {
    error.value = reason instanceof SyntaxError ? '主题配置或联系配置不是有效 JSON' : reason instanceof Error ? reason.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('网站设置尚未保存，确定离开当前页面吗？'))
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          网站设置
        </h1><p class="mt-1 text-sm text-muted">
          维护默认 SEO、品牌资源、页脚与联系配置。
        </p>
      </div>
      <UButton
        icon="i-lucide-save"
        label="保存设置"
        :loading="saving"
        :disabled="loading"
        @click="save"
      />
    </div>
    <AdminOperationsPageState
      :loading="loading"
      :error="error && !dirty ? error : ''"
      @retry="load"
    >
      <div
        class="space-y-6"
        @input="dirty = true"
        @change="dirty = true"
      >
        <UAlert
          v-if="notice"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :description="notice"
        />
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="error"
        />
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              站点与品牌
            </h2>
          </template>
          <div class="grid gap-5 md:grid-cols-2">
            <UFormField
              label="网站名称"
              required
            >
              <UInput
                v-model="form.siteName"
                class="w-full"
              />
            </UFormField>
            <UFormField label="网站地址">
              <UInput
                v-model="form.siteUrl"
                class="w-full"
                placeholder="https://example.com"
              />
            </UFormField>
            <UFormField label="Logo 路径">
              <UInput
                v-model="form.logo"
                class="w-full"
                placeholder="/uploads/..."
              />
            </UFormField>
            <UFormField label="Favicon 路径">
              <UInput
                v-model="form.favicon"
                class="w-full"
                placeholder="/uploads/..."
              />
            </UFormField>
          </div>
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              默认 SEO
            </h2>
          </template>
          <div class="grid gap-5">
            <UFormField label="默认标题">
              <UInput
                v-model="form.siteTitle"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="关键词"
              hint="使用逗号分隔"
            >
              <UInput
                v-model="form.siteKeywords"
                class="w-full"
              />
            </UFormField>
            <UFormField label="网站描述">
              <UTextarea
                v-model="form.siteDescription"
                class="w-full"
                :rows="4"
              />
            </UFormField>
          </div>
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              页脚与备案
            </h2>
          </template>
          <div class="grid gap-5 md:grid-cols-2">
            <UFormField label="版权信息">
              <UInput
                v-model="form.copyright"
                class="w-full"
              />
            </UFormField>
            <UFormField label="ICP备案号">
              <UInput
                v-model="form.icpNumber"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="页脚内容"
              class="md:col-span-2"
            >
              <UTextarea
                v-model="form.footerText"
                class="w-full"
                :rows="4"
              />
            </UFormField>
          </div>
        </UCard>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-highlighted">
                社交媒体
              </h2><UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-plus"
                label="添加链接"
                @click="addSocialLink"
              />
            </div>
          </template>
          <div
            v-if="form.socialLinks.length"
            class="space-y-3"
          >
            <div
              v-for="(_, index) in form.socialLinks"
              :key="index"
              class="grid gap-2 sm:grid-cols-[12rem_1fr_auto]"
            >
              <UInput
                v-model="form.socialLinks[index]!.name"
                placeholder="平台名称"
              />
              <UInput
                v-model="form.socialLinks[index]!.url"
                placeholder="https://..."
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除链接"
                @click="form.socialLinks.splice(index, 1); dirty = true"
              />
            </div>
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            尚未配置社交媒体链接。
          </p>
        </UCard>
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              结构化配置
            </h2>
          </template>
          <div class="grid gap-5 lg:grid-cols-2">
            <UFormField
              label="主题基础配置（JSON）"
              hint="只允许配置数据，不执行脚本"
            >
              <UTextarea
                v-model="themeJson"
                class="w-full font-mono text-sm"
                :rows="10"
              />
            </UFormField>
            <UFormField label="联系信息配置（JSON）">
              <UTextarea
                v-model="contactJson"
                class="w-full font-mono text-sm"
                :rows="10"
              />
            </UFormField>
          </div>
        </UCard>
      </div>
    </AdminOperationsPageState>
  </div>
</template>
