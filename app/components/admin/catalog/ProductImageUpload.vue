<script setup lang="ts">
export interface UploadedProductImage {
  id: number
  url: string
  originalName: string
  mimeType: string
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

const props = withDefaults(defineProps<{
  multiple?: boolean
  disabled?: boolean
  label?: string
  inputTestId?: string
  maxFiles?: number
}>(), {
  multiple: false,
  disabled: false,
  label: '上传图片',
  inputTestId: undefined,
  maxFiles: undefined
})

const emit = defineEmits<{
  uploaded: [image: UploadedProductImage]
}>()

const toast = useToast()
const input = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadDisabled = computed(() => props.disabled || uploading.value || props.maxFiles === 0)

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }, message?: string }
    return value.data?.message || value.message || '上传失败，请稍后重试'
  }
  return '上传失败，请稍后重试'
}

async function uploadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    toast.add({ title: '无法上传', description: `${file.name} 不是支持的图片文件`, color: 'error' })
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: '无法上传', description: `${file.name} 不能超过 10 MB`, color: 'error' })
    return
  }

  const body = new FormData()
  body.append('file', file)
  try {
    const response = await $fetch<ApiResponse<UploadedProductImage>>('/api/upload', {
      method: 'POST',
      body
    })
    emit('uploaded', response.data)
  } catch (error) {
    toast.add({ title: `${file.name} 上传失败`, description: getErrorMessage(error), color: 'error' })
  }
}

async function selectFiles(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  target.value = ''
  if (!files.length || uploading.value) return
  const allowance = props.maxFiles === undefined ? files.length : Math.max(0, props.maxFiles)
  const selectedFiles = files.slice(0, allowance)
  const skippedCount = files.length - selectedFiles.length
  if (skippedCount) {
    toast.add({
      title: '部分图片未上传',
      description: `详情图片最多 50 张，已跳过 ${skippedCount} 张`,
      color: 'warning'
    })
  }
  if (!selectedFiles.length) return

  uploading.value = true
  try {
    for (const file of selectedFiles) {
      await uploadFile(file)
    }
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div>
    <input
      ref="input"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      :multiple="multiple"
      :disabled="uploadDisabled"
      :aria-label="label"
      :data-testid="inputTestId"
      class="hidden"
      @change="selectFiles"
    >
    <UButton
      type="button"
      icon="i-lucide-upload"
      :label="label"
      color="neutral"
      variant="soft"
      size="sm"
      :loading="uploading"
      :disabled="uploadDisabled"
      @click="input?.click()"
    />
  </div>
</template>
