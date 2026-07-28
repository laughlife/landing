<script setup lang="ts">
interface ArticleForm {
  title: string
  slug: string
  summary: string
  content: string
  coverImage: string
  author: string
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED'
  isFeatured: boolean
  sortOrder: number
  seoTitle: string
  seoKeywords: string
  seoDescription: string
  publishedAt: string
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

const props = defineProps<{ articleId?: string }>()
const toast = useToast()

useSeoMeta({ robots: 'noindex, nofollow' })

const initialForm = (): ArticleForm => ({
  title: '',
  slug: '',
  summary: '',
  content: '',
  coverImage: '',
  author: '',
  status: 'DRAFT',
  isFeatured: false,
  sortOrder: 0,
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  publishedAt: ''
})

const form = ref<ArticleForm>(initialForm())
const loading = ref(Boolean(props.articleId))
const loadError = ref('')
const saving = ref(false)
const formError = ref('')
const savedSnapshot = ref(JSON.stringify(form.value))
const isDirty = computed(() => JSON.stringify(form.value) !== savedSnapshot.value)
const pageTitle = computed(() => props.articleId ? '编辑文章' : '新建文章')

function toLocalDateTime(value: unknown) {
  if (!value)
    return ''
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

async function loadArticle() {
  if (!props.articleId)
    return
  loading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<ApiEnvelope<Record<string, unknown>>>(`/api/admin/articles/${props.articleId}`)
    const item = response.data
    form.value = {
      title: String(item.title ?? ''),
      slug: String(item.slug ?? ''),
      summary: String(item.summary ?? ''),
      content: String(item.content ?? ''),
      coverImage: String(item.coverImage ?? ''),
      author: String(item.author ?? ''),
      status: (item.status as ArticleForm['status']) ?? 'DRAFT',
      isFeatured: Boolean(item.isFeatured),
      sortOrder: Number(item.sortOrder ?? 0),
      seoTitle: String(item.seoTitle ?? ''),
      seoKeywords: String(item.seoKeywords ?? ''),
      seoDescription: String(item.seoDescription ?? ''),
      publishedAt: toLocalDateTime(item.publishedAt)
    }
    savedSnapshot.value = JSON.stringify(form.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '文章加载失败'
  } finally {
    loading.value = false
  }
}

function validate() {
  if (!form.value.title.trim()) {
    formError.value = '请填写文章标题'
    return false
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.value.slug)) {
    formError.value = 'Slug 只能使用小写字母、数字和连字符'
    return false
  }
  if (form.value.status === 'PUBLISHED' && !form.value.content.trim()) {
    formError.value = '发布文章前请填写正文'
    return false
  }
  return true
}

async function save() {
  formError.value = ''
  if (!validate())
    return
  saving.value = true
  try {
    const response = await $fetch<ApiEnvelope<Record<string, unknown>>>(
      props.articleId ? `/api/admin/articles/${props.articleId}` : '/api/admin/articles',
      {
        method: props.articleId ? 'PATCH' : 'POST',
        body: {
          title: form.value.title,
          slug: form.value.slug,
          summary: form.value.summary || null,
          content: form.value.content || null,
          coverImage: form.value.coverImage || null,
          author: form.value.author || null,
          status: form.value.status,
          isFeatured: form.value.isFeatured,
          sortOrder: form.value.sortOrder,
          seoTitle: form.value.seoTitle || null,
          seoKeywords: form.value.seoKeywords || null,
          seoDescription: form.value.seoDescription || null,
          publishedAt: form.value.publishedAt || null
        }
      }
    )
    savedSnapshot.value = JSON.stringify(form.value)
    toast.add({ title: '文章已保存', color: 'success' })
    if (!props.articleId) {
      const createdId = response.data.id
      await navigateTo(createdId ? `/admin/articles/${String(createdId)}` : '/admin/articles')
    }
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败，请检查表单后重试'
  } finally {
    saving.value = false
  }
}

onBeforeRouteLeave(() => {
  if (!isDirty.value || !import.meta.client)
    return true
  return window.confirm('文章尚未保存，确定离开当前页面吗？')
})

onMounted(() => void loadArticle())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm text-muted">
          <NuxtLink
            to="/admin/articles"
            class="hover:text-highlighted"
          >
            新闻资讯
          </NuxtLink>
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4"
          />
          <span>{{ pageTitle }}</span>
        </div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ pageTitle }}
        </h1>
      </div>
      <div class="flex gap-3">
        <UButton
          to="/admin/articles"
          color="neutral"
          variant="ghost"
        >
          返回列表
        </UButton>
        <UButton
          icon="i-lucide-save"
          :loading="saving"
          @click="save"
        >
          保存文章
        </UButton>
      </div>
    </div>

    <div
      v-if="loading"
      class="space-y-4"
    >
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-96 w-full" />
    </div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      title="文章加载失败"
      :description="loadError"
      :actions="[{ label: '重新加载', onClick: loadArticle }]"
    />
    <form
      v-else
      class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      @submit.prevent="save"
    >
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              基础信息
            </h2>
          </template>
          <div class="grid gap-5">
            <UFormField
              label="文章标题"
              required
            >
              <UInput
                v-model="form.title"
                class="w-full"
                placeholder="请输入文章标题"
              />
            </UFormField>
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField
                label="Slug"
                required
                description="用于新闻详情页 URL，仅支持小写字母、数字和连字符。"
              >
                <UInput
                  v-model="form.slug"
                  class="w-full"
                  placeholder="company-news"
                />
              </UFormField>
              <UFormField label="作者">
                <UInput
                  v-model="form.author"
                  class="w-full"
                  placeholder="吴月商贸"
                />
              </UFormField>
            </div>
            <UFormField label="摘要">
              <UTextarea
                v-model="form.summary"
                :rows="4"
                class="w-full"
                placeholder="用于列表页和分享描述"
              />
            </UFormField>
            <UFormField label="文章封面图">
              <AdminMediaPicker
                v-model="form.coverImage"
                button-label="选择文章封面"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">
                文章正文
              </h2>
              <p class="mt-1 text-sm text-muted">
                使用富文本工具栏编排标题、列表、引用和代码块。
              </p>
            </div>
          </template>
          <AdminRichTextEditor
            v-model="form.content"
            placeholder="输入文章正文…"
          />
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              SEO 设置
            </h2>
          </template>
          <div class="grid gap-5">
            <UFormField label="SEO 标题">
              <UInput
                v-model="form.seoTitle"
                class="w-full"
              />
            </UFormField>
            <UFormField label="SEO 关键词">
              <UInput
                v-model="form.seoKeywords"
                class="w-full"
                placeholder="关键词之间使用英文逗号分隔"
              />
            </UFormField>
            <UFormField label="SEO 描述">
              <UTextarea
                v-model="form.seoDescription"
                :rows="4"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>
      </div>

      <div class="space-y-6">
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">
              发布设置
            </h2>
          </template>
          <div class="grid gap-5">
            <UFormField label="状态">
              <USelect
                v-model="form.status"
                class="w-full"
                :items="[
                  { label: '草稿', value: 'DRAFT' },
                  { label: '已发布', value: 'PUBLISHED' },
                  { label: '已停用', value: 'DISABLED' }
                ]"
              />
            </UFormField>
            <UFormField label="发布时间">
              <UInput
                v-model="form.publishedAt"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField label="排序">
              <UInput
                v-model.number="form.sortOrder"
                type="number"
                class="w-full"
              />
            </UFormField>
            <UFormField label="推荐文章">
              <USwitch v-model="form.isFeatured" />
            </UFormField>
          </div>
        </UCard>
        <UAlert
          v-if="isDirty"
          color="warning"
          variant="subtle"
          icon="i-lucide-file-warning"
          title="有未保存的修改"
          description="离开页面前请先保存。"
        />
        <UAlert
          v-if="formError"
          color="error"
          variant="subtle"
          :description="formError"
        />
        <UButton
          type="submit"
          block
          icon="i-lucide-save"
          :loading="saving"
        >
          保存文章
        </UButton>
      </div>
    </form>
  </div>
</template>
