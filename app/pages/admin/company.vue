<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: '公司信息 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type CompanyForm = {
  companyName: string
  shortName: string
  slogan: string
  logo: string
  favicon: string
  heroTitle: string
  heroSubtitle: string
  introduction: string
  fullDescription: string
  businessScope: string
  advantages: string[]
  address: string
  phone: string
  email: string
  wechat: string
  whatsapp: string
  workingHours: string
  latitude: number | null
  longitude: number | null
  registrationInfo: string
}
type ApiResponse<T> = { success: boolean, data: T, message: string }

const blank = (): CompanyForm => ({
  companyName: '', shortName: '', slogan: '', logo: '', favicon: '', heroTitle: '', heroSubtitle: '',
  introduction: '', fullDescription: '', businessScope: '', advantages: [], address: '', phone: '',
  email: '', wechat: '', whatsapp: '', workingHours: '', latitude: null, longitude: null, registrationInfo: ''
})
const form = ref<CompanyForm>(blank())
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const savedMessage = ref('')
const dirty = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<Partial<CompanyForm>>>('/api/admin/company')
    form.value = { ...blank(), ...response.data, advantages: Array.isArray(response.data?.advantages) ? response.data.advantages : [] }
    dirty.value = false
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '公司信息加载失败'
  } finally {
    loading.value = false
  }
}

function addAdvantage() {
  form.value.advantages.push('')
  dirty.value = true
}

function removeAdvantage(index: number) {
  form.value.advantages.splice(index, 1)
  dirty.value = true
}

async function save() {
  if (!form.value.companyName.trim()) {
    error.value = '公司名称不能为空'
    return
  }
  saving.value = true
  error.value = ''
  savedMessage.value = ''
  try {
    const payload = {
      ...form.value,
      advantages: form.value.advantages.map(item => item.trim()).filter(Boolean),
      latitude: form.value.latitude === null ? null : Number(form.value.latitude),
      longitude: form.value.longitude === null ? null : Number(form.value.longitude)
    }
    const response = await $fetch<ApiResponse<CompanyForm>>('/api/admin/company', { method: 'PUT', body: payload })
    form.value = { ...blank(), ...response.data }
    dirty.value = false
    savedMessage.value = response.message || '公司信息已保存'
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '保存失败，请稍后重试'
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('公司信息尚未保存，确定离开当前页面吗？'))
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          公司信息
        </h1>
        <p class="mt-1 text-sm text-muted">
          维护官网公司介绍、主视觉和联系信息。
        </p>
      </div>
      <UButton
        icon="i-lucide-save"
        label="保存修改"
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
          v-if="savedMessage"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          :description="savedMessage"
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
              基础信息
            </h2>
          </template>
          <div class="grid gap-5 md:grid-cols-2">
            <UFormField
              label="公司名称"
              required
            >
              <UInput
                v-model="form.companyName"
                class="w-full"
                maxlength="200"
              />
            </UFormField>
            <UFormField label="公司简称">
              <UInput
                v-model="form.shortName"
                class="w-full"
                maxlength="100"
              />
            </UFormField>
            <UFormField
              label="品牌标语"
              class="md:col-span-2"
            >
              <UInput
                v-model="form.slogan"
                class="w-full"
                maxlength="255"
              />
            </UFormField>
            <UFormField
              label="Logo 路径"
              hint="使用 /uploads/... 站内路径"
            >
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
            <UFormField
              label="登记信息"
              class="md:col-span-2"
            >
              <UInput
                v-model="form.registrationInfo"
                class="w-full"
                maxlength="500"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              首页主视觉与公司介绍
            </h2>
          </template>
          <div class="grid gap-5">
            <UFormField label="主标题">
              <UInput
                v-model="form.heroTitle"
                class="w-full"
                maxlength="255"
              />
            </UFormField>
            <UFormField label="副标题">
              <UTextarea
                v-model="form.heroSubtitle"
                class="w-full"
                :rows="3"
                maxlength="1000"
              />
            </UFormField>
            <UFormField label="公司简介">
              <UTextarea
                v-model="form.introduction"
                class="w-full"
                :rows="5"
              />
            </UFormField>
            <UFormField
              label="完整介绍"
              hint="可填写经过后台清理的富文本内容"
            >
              <AdminRichTextEditor
                v-model="form.fullDescription"
                placeholder="请输入公司完整介绍…"
              />
            </UFormField>
            <UFormField label="业务范围">
              <AdminRichTextEditor
                v-model="form.businessScope"
                placeholder="请输入主营业务范围…"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold text-highlighted">
                核心优势
              </h2>
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                icon="i-lucide-plus"
                label="添加优势"
                @click="addAdvantage"
              />
            </div>
          </template>
          <div
            v-if="form.advantages.length"
            class="space-y-3"
          >
            <div
              v-for="(_, index) in form.advantages"
              :key="index"
              class="flex gap-2"
            >
              <UInput
                v-model="form.advantages[index]"
                class="flex-1"
                :placeholder="`优势 ${index + 1}`"
                maxlength="500"
              />
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除优势"
                @click="removeAdvantage(index)"
              />
            </div>
          </div>
          <p
            v-else
            class="text-sm text-muted"
          >
            尚未添加公司优势。
          </p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              联系方式与位置
            </h2>
          </template>
          <div class="grid gap-5 md:grid-cols-2">
            <UFormField label="电话">
              <UInput
                v-model="form.phone"
                class="w-full"
              />
            </UFormField>
            <UFormField label="邮箱">
              <UInput
                v-model="form.email"
                type="email"
                class="w-full"
              />
            </UFormField>
            <UFormField label="微信">
              <UInput
                v-model="form.wechat"
                class="w-full"
              />
            </UFormField>
            <UFormField label="WhatsApp">
              <UInput
                v-model="form.whatsapp"
                class="w-full"
              />
            </UFormField>
            <UFormField label="工作时间">
              <UInput
                v-model="form.workingHours"
                class="w-full"
              />
            </UFormField>
            <UFormField label="地址">
              <UInput
                v-model="form.address"
                class="w-full"
              />
            </UFormField>
            <UFormField label="纬度">
              <UInput
                v-model.number="form.latitude"
                type="number"
                step="0.0000001"
                class="w-full"
              />
            </UFormField>
            <UFormField label="经度">
              <UInput
                v-model.number="form.longitude"
                type="number"
                step="0.0000001"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>
      </div>
    </AdminOperationsPageState>
  </div>
</template>
