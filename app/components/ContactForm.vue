<script setup lang="ts">
import type { ContactPayload } from '~/composables/usePublicApi'

const props = withDefaults(defineProps<{
  sourcePage: string
  productId?: string
  subject?: string
}>(), {
  productId: undefined,
  subject: undefined
})

const { request } = usePublicApi()
const toast = useToast()
const pending = ref(false)
const form = reactive({
  name: '',
  company: '',
  phone: '',
  email: '',
  subject: props.subject ?? '',
  message: '',
  website: ''
})

async function submit() {
  if (pending.value) return
  if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
    toast.add({ title: '请完善姓名、联系电话和咨询内容', color: 'warning' })
    return
  }

  pending.value = true
  try {
    const payload: ContactPayload = {
      name: form.name.trim(),
      company: form.company.trim() || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      subject: form.subject.trim() || undefined,
      message: form.message.trim(),
      sourcePage: props.sourcePage,
      productId: props.productId,
      website: form.website.trim() || undefined
    }
    await request<unknown>('/api/public/contact', { method: 'POST', body: payload })
    toast.add({ title: '提交成功', description: '我们将尽快与您联系。', color: 'success' })
    form.name = ''
    form.company = ''
    form.phone = ''
    form.email = ''
    form.message = ''
    form.website = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : '提交失败，请稍后重试。'
    toast.add({ title: '提交失败', description: message, color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form
    class="space-y-5"
    :aria-busy="pending"
    @submit.prevent="submit"
  >
    <div
      class="hidden"
      aria-hidden="true"
    >
      <label for="website">网站</label>
      <input
        id="website"
        v-model="form.website"
        tabindex="-1"
        autocomplete="off"
      >
    </div>
    <div class="grid gap-5 sm:grid-cols-2">
      <label class="grid gap-2 text-sm font-medium text-highlighted">姓名 <input
        v-model="form.name"
        required
        autocomplete="name"
        class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
        placeholder="请填写您的姓名"
      ></label>
      <label class="grid gap-2 text-sm font-medium text-highlighted">联系电话 <input
        v-model="form.phone"
        required
        autocomplete="tel"
        class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
        placeholder="请填写联系电话"
      ></label>
      <label class="grid gap-2 text-sm font-medium text-highlighted">企业名称 <input
        v-model="form.company"
        autocomplete="organization"
        class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
        placeholder="选填"
      ></label>
      <label class="grid gap-2 text-sm font-medium text-highlighted">电子邮箱 <input
        v-model="form.email"
        type="email"
        autocomplete="email"
        class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
        placeholder="选填"
      ></label>
    </div>
    <label class="grid gap-2 text-sm font-medium text-highlighted">咨询主题 <input
      v-model="form.subject"
      class="rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
      placeholder="选填"
    ></label>
    <label class="grid gap-2 text-sm font-medium text-highlighted">咨询内容 <textarea
      v-model="form.message"
      required
      rows="5"
      class="resize-y rounded-lg border border-default bg-default px-3 py-2.5 outline-none ring-primary transition focus:ring-2"
      placeholder="请描述您的需求"
    /></label>
    <UButton
      type="submit"
      label="提交咨询"
      :loading="pending"
      :disabled="pending"
      size="lg"
    />
  </form>
</template>
