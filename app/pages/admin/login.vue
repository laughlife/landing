<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: false,
  middleware: 'admin'
})

useSeoMeta({
  title: '后台登录 - 南阳市吴月商贸行',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const toast = useToast()
const { login } = useAdminApi()

const state = reactive({
  username: '',
  password: ''
})
const submitting = ref(false)
const showPassword = ref(false)
const submitError = ref('')

function validate(formState: typeof state): FormError[] {
  const errors: FormError[] = []
  if (!formState.username.trim()) errors.push({ name: 'username', message: '请输入用户名' })
  if (!formState.password) errors.push({ name: 'password', message: '请输入密码' })
  return errors
}

const redirectTarget = computed(() => {
  const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
  return redirect && redirect.startsWith('/admin') && !redirect.startsWith('//')
    ? redirect
    : '/admin'
})

async function onSubmit(event: FormSubmitEvent<typeof state>) {
  if (submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await login(event.data.username.trim(), event.data.password)
    toast.add({ title: '登录成功', description: '欢迎回到网站管理后台', color: 'success' })
    await navigateTo(redirectTarget.value)
  } catch (error) {
    submitError.value = getAdminApiErrorMessage(error, '用户名或密码错误')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="relative grid min-h-screen place-items-center overflow-hidden bg-default px-4 py-10 sm:px-6">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-1/2 top-[-18rem] size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div class="absolute bottom-[-20rem] right-[-10rem] size-[32rem] rounded-full bg-warning/10 blur-3xl" />
    </div>

    <div class="relative w-full max-w-md">
      <div class="mb-8 flex justify-center">
        <AdminBrand />
      </div>

      <UCard
        variant="subtle"
        class="shadow-xl shadow-black/5"
        :ui="{ body: 'p-6 sm:p-8', header: 'p-6 pb-0 sm:px-8 sm:pt-8' }"
      >
        <template #header>
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
              登录管理后台
            </h1>
            <p class="mt-2 text-sm text-muted">
              请输入管理员账号和密码继续
            </p>
          </div>
        </template>

        <UAlert
          v-if="submitError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="登录失败"
          :description="submitError"
          class="mb-5"
        />

        <UForm
          :state="state"
          :validate="validate"
          class="space-y-5"
          @submit="onSubmit"
        >
          <UFormField
            label="用户名"
            name="username"
            required
          >
            <UInput
              v-model="state.username"
              icon="i-lucide-user"
              placeholder="请输入用户名"
              autocomplete="username"
              autofocus
              size="lg"
              class="w-full"
              :disabled="submitting"
            />
          </UFormField>

          <UFormField
            label="密码"
            name="password"
            required
          >
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock-keyhole"
              placeholder="请输入密码"
              autocomplete="current-password"
              size="lg"
              class="w-full"
              :disabled="submitting"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="sm"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  :disabled="submitting"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UButton
            type="submit"
            block
            size="lg"
            icon="i-lucide-log-in"
            :loading="submitting"
          >
            {{ submitting ? '正在登录…' : '登录' }}
          </UButton>
        </UForm>
      </UCard>

      <p class="mt-6 text-center text-xs text-dimmed">
        仅限授权管理员访问，登录行为将被安全记录
      </p>
    </div>
  </main>
</template>
