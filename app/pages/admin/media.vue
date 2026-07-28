<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: '媒体库 - 管理后台', meta: [{ name: 'robots', content: 'noindex,nofollow' }] })

type MediaItem = {
  id: number
  originalName: string
  url: string
  mimeType: string
  size: number
  width?: number | null
  height?: number | null
  category: 'IMAGE' | 'DOCUMENT' | 'OTHER'
  createdAt: string
  referenceCount?: number
}
type PageData<T> = { items?: T[], total?: number, page?: number, pageSize?: number, pagination?: { total: number, page: number, pageSize: number } }
type ApiResponse<T> = { success: boolean, data: T, message: string }
type ApiErrorResponse = { code?: string, message?: string }
type ApiErrorEnvelope = ApiErrorResponse & { data?: ApiErrorResponse | null }
type MediaUsage = {
  key: string
  resourceType: string
  resourceId: number
  resourceLabel: string
  field: string
  fieldLabel: string
  locationLabel: string
  editUrl: string
}
type MediaReferencesData = {
  media: Pick<MediaItem, 'id' | 'originalName' | 'url'>
  references: MediaUsage[]
  total: number
}

const items = ref<MediaItem[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const keyword = ref('')
const category = ref('ALL')
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const notice = ref('')
const preview = ref<MediaItem | null>(null)
const pendingDelete = ref<MediaItem | null>(null)
const deleting = ref(false)
const checkingDeleteId = ref<number | null>(null)
const referenceTarget = ref<MediaItem | null>(null)
const references = ref<MediaUsage[]>([])
const referencesLoading = ref(false)
const referencesError = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const categoryOptions = [{ label: '全部类型', value: 'ALL' }, { label: '图片', value: 'IMAGE' }, { label: '文档', value: 'DOCUMENT' }, { label: '其他', value: 'OTHER' }]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<PageData<MediaItem> | MediaItem[]>>('/api/admin/media', {
      query: { page: page.value, pageSize, keyword: keyword.value || undefined, category: category.value === 'ALL' ? undefined : category.value }
    })
    const data = response.data
    items.value = Array.isArray(data) ? data : data.items || []
    const meta = Array.isArray(data) ? undefined : data.pagination
    total.value = Array.isArray(data) ? data.length : meta?.total ?? data.total ?? items.value.length
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '媒体文件加载失败'
  } finally {
    loading.value = false
  }
}

async function upload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return
  uploading.value = true
  error.value = ''
  try {
    for (const file of files) {
      const body = new FormData()
      body.append('file', file)
      await $fetch('/api/upload', { method: 'POST', body })
    }
    notice.value = `已上传 ${files.length} 个文件`
    page.value = 1
    await load()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '上传失败'
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function loadReferences(target: MediaItem) {
  const response = await $fetch<ApiResponse<MediaReferencesData>>(`/api/admin/media-references/${target.id}`)
  references.value = response.data.references
  target.referenceCount = response.data.total
}

async function openReferences(target: MediaItem) {
  referenceTarget.value = target
  references.value = []
  referencesError.value = ''
  referencesLoading.value = true
  try {
    await loadReferences(target)
  } catch (reason) {
    referencesError.value = reason instanceof Error ? reason.message : '引用位置加载失败'
  } finally {
    referencesLoading.value = false
  }
}

async function prepareDelete(target: MediaItem) {
  checkingDeleteId.value = target.id
  error.value = ''
  try {
    await loadReferences(target)
    if (references.value.length) {
      referenceTarget.value = target
      referencesError.value = ''
      return
    }
    pendingDelete.value = target
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '删除前无法核对引用位置，请稍后重试'
  } finally {
    checkingDeleteId.value = null
  }
}

async function remove() {
  if (!pendingDelete.value) return
  const target = pendingDelete.value
  pendingDelete.value = null
  deleting.value = true
  error.value = ''
  notice.value = ''
  try {
    const response = await $fetch<ApiResponse<unknown>>(`/api/admin/media/${target.id}`, { method: 'DELETE' })
    notice.value = response.message || '文件已删除'
    if (preview.value?.id === target.id) preview.value = null
    await load()
  } catch (reason) {
    const apiError = reason as { data?: ApiErrorEnvelope, message?: string }
    const failure = apiError.data?.code ? apiError.data : apiError.data?.data
    if (failure?.code === 'MEDIA_IN_USE') {
      await openReferences(target)
    } else {
      error.value = failure?.message || apiError.data?.message || apiError.message || '删除失败，请稍后重试'
    }
  } finally {
    deleting.value = false
  }
}

watch([page, category], load)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 350)
})
onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          媒体库
        </h1><p class="mt-1 text-sm text-muted">
          上传、检索和安全管理站点图片与文档。
        </p>
      </div>
      <div>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
          @change="upload"
        >
        <UButton
          icon="i-lucide-upload"
          label="上传文件"
          :loading="uploading"
          @click="fileInput?.click()"
        />
      </div>
    </div>
    <UAlert
      v-if="notice"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      :description="notice"
      :close="{ onClick: () => notice = '' }"
    />
    <UAlert
      v-if="error && items.length"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :description="error"
    />
    <UCard>
      <div class="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <UInput
          v-model="keyword"
          icon="i-lucide-search"
          placeholder="搜索文件名…"
        />
        <USelect
          v-model="category"
          :items="categoryOptions"
        />
      </div>
    </UCard>
    <AdminOperationsPageState
      :loading="loading"
      :error="error && !items.length ? error : ''"
      :empty="!items.length"
      empty-title="媒体库为空"
      empty-description="上传第一张图片或文档后，会在这里显示。"
      @retry="load"
    >
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard
          v-for="item in items"
          :key="item.id"
          :ui="{ body: 'p-0 sm:p-0', footer: 'p-3 sm:px-3' }"
        >
          <button
            class="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-t-xl bg-elevated"
            type="button"
            @click="preview = item"
          >
            <img
              v-if="item.mimeType.startsWith('image/')"
              :src="item.url"
              :alt="item.originalName"
              class="size-full object-cover"
              loading="lazy"
            >
            <UIcon
              v-else
              name="i-lucide-file-text"
              class="size-12 text-muted"
            />
          </button>
          <template #footer>
            <p
              class="truncate text-sm font-medium text-highlighted"
              :title="item.originalName"
            >
              {{ item.originalName }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ formatSize(item.size) }}<span v-if="item.width && item.height"> · {{ item.width }}×{{ item.height }}</span>
            </p>
            <div class="mt-3 flex items-center justify-between gap-2">
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-map-pin"
                :label="item.referenceCount === undefined ? '查看引用' : `引用 ${item.referenceCount} 处`"
                @click="openReferences(item)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除文件"
                :loading="checkingDeleteId === item.id"
                @click="prepareDelete(item)"
              />
            </div>
          </template>
        </UCard>
      </div>
      <AdminOperationsPagination
        v-model:page="page"
        :page-size="pageSize"
        :total="total"
        :disabled="loading"
        class="mt-5 rounded-xl border border-default"
      />
    </AdminOperationsPageState>
    <div
      v-if="preview"
      class="fixed inset-0 z-40 grid place-items-center bg-black/75 p-4"
      @click.self="preview = null"
    >
      <div class="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-default p-4">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="font-medium text-highlighted">
              {{ preview.originalName }}
            </p><p class="text-sm text-muted">
              {{ preview.mimeType }} · {{ formatSize(preview.size) }} · {{ new Date(preview.createdAt).toLocaleString('zh-CN') }}
            </p>
          </div><UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="关闭预览"
            @click="preview = null"
          />
        </div>
        <img
          v-if="preview.mimeType.startsWith('image/')"
          :src="preview.url"
          :alt="preview.originalName"
          class="mx-auto max-h-[70vh] rounded-lg object-contain"
        >
        <div
          v-else
          class="grid min-h-64 place-items-center"
        >
          <UButton
            :to="preview.url"
            target="_blank"
            icon="i-lucide-external-link"
            label="在新窗口打开文件"
          />
        </div>
      </div>
    </div>
    <div
      v-if="referenceTarget"
      class="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
      @click.self="referenceTarget = null"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-default p-5 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">
              图片引用位置
            </h2>
            <p class="mt-1 break-all text-sm text-muted">
              {{ referenceTarget.originalName }}
            </p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="关闭引用位置"
            @click="referenceTarget = null"
          />
        </div>
        <div
          v-if="referencesLoading"
          class="grid min-h-40 place-items-center text-sm text-muted"
        >
          正在核对引用位置…
        </div>
        <UAlert
          v-else-if="referencesError"
          class="mt-4"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          title="引用位置加载失败"
          :description="referencesError"
        />
        <div
          v-else-if="references.length"
          class="mt-4 space-y-3"
        >
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-link"
            title="该文件暂时不能删除"
            description="请前往下列位置移除图片并保存，再回到媒体库删除文件。"
          />
          <div
            v-for="reference in references"
            :key="reference.key"
            class="flex flex-col gap-3 rounded-xl border border-default p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-medium text-highlighted">
                {{ reference.locationLabel }} · {{ reference.resourceLabel }}
              </p>
              <p class="mt-1 text-sm text-muted">
                引用字段：{{ reference.fieldLabel }}
              </p>
            </div>
            <UButton
              :to="reference.editUrl"
              color="neutral"
              variant="soft"
              icon="i-lucide-external-link"
              label="前往解除引用"
              @click="referenceTarget = null"
            />
          </div>
        </div>
        <UAlert
          v-else
          class="mt-4"
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check"
          title="当前未被引用"
          description="这个文件没有被站点内容使用，可以安全删除。"
        />
      </div>
    </div>
    <AdminOperationsConfirmDialog
      :open="Boolean(pendingDelete)"
      title="删除媒体文件？"
      :description="`将删除“${pendingDelete?.originalName || ''}”及其衍生文件。若仍被内容引用，服务端会拒绝操作。`"
      confirm-label="确认删除"
      danger
      :loading="deleting"
      @cancel="pendingDelete = null"
      @confirm="remove"
    />
  </div>
</template>
