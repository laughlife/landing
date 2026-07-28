<script setup lang="ts">
import type { AdminMediaItem } from '~/types/admin-media'

type MediaList = {
  items: AdminMediaItem[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
type ApiResponse<T> = { success: boolean, data: T, message: string }

const props = withDefaults(defineProps<{
  modelValue?: string | null
  disabled?: boolean
  buttonLabel?: string
}>(), {
  modelValue: '',
  disabled: false,
  buttonLabel: '从媒体库选择'
})
const emit = defineEmits<{
  'update:modelValue': [url: string]
  select: [media: AdminMediaItem]
}>()

const open = ref(false)
const items = ref<AdminMediaItem[]>([])
const page = ref(1)
const pageSize = 12
const total = ref(0)
const keyword = ref('')
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestVersion = 0

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

async function load() {
  const version = ++requestVersion
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<ApiResponse<MediaList>>('/api/admin/media', {
      query: {
        page: page.value,
        pageSize,
        keyword: keyword.value || undefined,
        category: 'IMAGE',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    })
    if (version !== requestVersion) return
    items.value = response.data.items
    total.value = response.data.total
  } catch (reason) {
    if (version !== requestVersion) return
    error.value = reason instanceof Error ? reason.message : '媒体库加载失败'
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function select(media: AdminMediaItem) {
  emit('update:modelValue', media.url)
  emit('select', media)
  open.value = false
}

async function upload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    const response = await $fetch<ApiResponse<AdminMediaItem>>('/api/upload', { method: 'POST', body })
    select(response.data)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '图片上传失败'
  } finally {
    uploading.value = false
    target.value = ''
  }
}

watch(open, (value) => {
  if (!value) return
  page.value = 1
  keyword.value = ''
  void load()
})
watch(page, () => {
  if (open.value) void load()
})
watch(keyword, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    if (open.value) void load()
  }, 350)
})
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <div class="space-y-3">
    <div
      v-if="modelValue"
      class="flex items-center gap-3 rounded-xl border border-default bg-elevated/40 p-3"
    >
      <img
        :src="modelValue"
        alt="当前选择的图片"
        class="size-20 shrink-0 rounded-lg object-cover"
      >
      <p class="min-w-0 flex-1 break-all text-xs text-muted">
        {{ modelValue }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        icon="i-lucide-images"
        :label="buttonLabel"
        :disabled="disabled"
        @click="open = true"
      />
      <UButton
        v-if="modelValue"
        type="button"
        color="error"
        variant="ghost"
        icon="i-lucide-x"
        label="清空图片"
        :disabled="disabled"
        @click="emit('update:modelValue', '')"
      />
    </div>

    <UModal
      v-model:open="open"
      title="从媒体库选择图片"
      description="选择已有图片，或上传新图片后直接使用。"
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row">
            <UInput
              v-model="keyword"
              class="flex-1"
              icon="i-lucide-search"
              placeholder="搜索图片名称…"
            />
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              :disabled="disabled"
              @change="upload"
            >
            <UButton
              type="button"
              icon="i-lucide-upload"
              label="上传新图片"
              :loading="uploading"
              :disabled="disabled"
              @click="fileInput?.click()"
            />
          </div>
          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            :description="error"
          />
          <div
            v-if="loading"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <USkeleton
              v-for="index in 6"
              :key="index"
              class="aspect-square w-full"
            />
          </div>
          <div
            v-else-if="items.length"
            class="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <button
              v-for="item in items"
              :key="item.id"
              type="button"
              class="overflow-hidden rounded-xl border text-left transition hover:border-primary"
              :class="item.url === modelValue ? 'border-primary ring-2 ring-primary/20' : 'border-default'"
              :disabled="disabled"
              @click="select(item)"
            >
              <img
                :src="item.url"
                :alt="item.originalName"
                class="aspect-square w-full bg-elevated object-cover"
                loading="lazy"
              >
              <span class="block truncate px-3 pt-2 text-sm font-medium text-highlighted">{{ item.originalName }}</span>
              <span class="block px-3 pb-2 text-xs text-muted">{{ formatSize(item.size) }}</span>
            </button>
          </div>
          <div
            v-else
            class="rounded-xl border border-dashed border-default py-12 text-center text-sm text-muted"
          >
            媒体库中没有符合条件的图片
          </div>
          <AdminOperationsPagination
            v-model:page="page"
            :page-size="pageSize"
            :total="total"
            :disabled="loading"
          />
          <div class="flex justify-between border-t border-default pt-4">
            <UButton
              to="/admin/media"
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              label="管理媒体库"
            />
            <UButton
              type="button"
              color="neutral"
              variant="soft"
              label="取消"
              @click="open = false"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
