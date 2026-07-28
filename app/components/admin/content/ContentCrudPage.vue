<script setup lang="ts">
type FieldKind = 'text' | 'textarea' | 'richtext' | 'number' | 'select' | 'switch' | 'datetime' | 'string-list' | 'steps'

interface SelectOption {
  label: string
  value: string
}

interface FieldDefinition {
  key: string
  label: string
  kind?: FieldKind
  required?: boolean
  placeholder?: string
  description?: string
  options?: readonly SelectOption[]
  wide?: boolean
}

interface ColumnDefinition {
  key: string
  label: string
}

interface StepValue {
  title: string
  description?: string
}

interface PageMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface ListPayload {
  items: Array<Record<string, unknown>>
  page?: number
  pageSize?: number
  total?: number
  totalPages?: number
  pagination?: PageMeta
  meta?: PageMeta
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
}

const props = withDefaults(defineProps<{
  title: string
  description: string
  singular: string
  endpoint: string
  fields: readonly FieldDefinition[]
  columns: readonly ColumnDefinition[]
  defaults?: Record<string, unknown>
  statusOptions?: readonly SelectOption[]
}>(), {
  defaults: () => ({}),
  statusOptions: () => [
    { label: '全部状态', value: 'ALL' },
    { label: '已启用', value: 'ENABLED' },
    { label: '已停用', value: 'DISABLED' }
  ]
})

useSeoMeta({ robots: 'noindex, nofollow' })

const toast = useToast()
const rows = ref<Array<Record<string, unknown>>>([])
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const status = ref('ALL')
const page = ref(1)
const pageSize = 10
const meta = ref<PageMeta>({ page: 1, pageSize, total: 0, totalPages: 0 })
const editorOpen = ref(false)
const deleteOpen = ref(false)
const saving = ref(false)
const deleting = ref(false)
const editingId = ref<number | null>(null)
const deletingRow = ref<Record<string, unknown> | null>(null)
const form = ref<Record<string, unknown>>({})
const formError = ref('')

const editorTitle = computed(() => editingId.value ? `编辑${props.singular}` : `新增${props.singular}`)
const statusSelectOptions = computed(() => nonEmptySelectOptions(props.statusOptions))

function nonEmptySelectOptions(options: readonly SelectOption[] = []) {
  return options.filter(option => option.value !== '')
}

function defaultSelectValue(field: FieldDefinition) {
  return nonEmptySelectOptions(field.options)[0]?.value
}

function selectModelValue(key: string) {
  const value = form.value[key]
  return value === null || value === undefined || value === '' ? undefined : String(value)
}

function freshForm() {
  const next: Record<string, unknown> = { ...props.defaults }
  for (const field of props.fields) {
    if (next[field.key] !== undefined)
      continue
    next[field.key] = field.kind === 'switch'
      ? false
      : field.kind === 'number'
        ? 0
        : field.kind === 'string-list' || field.kind === 'steps'
          ? []
          : field.kind === 'select'
            ? defaultSelectValue(field)
            : ''
  }
  return next
}

function displayValue(row: Record<string, unknown>, key: string) {
  const value = row[key]
  if (typeof value === 'boolean')
    return value ? '是' : '否'
  if (value === null || value === undefined || value === '')
    return '—'
  if (key.endsWith('At')) {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN')
  }
  return String(value)
}

function badgeColor(value: unknown) {
  if (value === 'ENABLED' || value === 'PUBLISHED')
    return 'success'
  if (value === 'DRAFT')
    return 'warning'
  return 'neutral'
}

function statusLabel(value: unknown) {
  return {
    ENABLED: '已启用',
    DISABLED: '已停用',
    DRAFT: '草稿',
    PUBLISHED: '已发布'
  }[String(value)] ?? String(value)
}

async function loadRows() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await $fetch<ApiEnvelope<ListPayload>>(props.endpoint, {
      query: {
        page: page.value,
        pageSize,
        keyword: keyword.value || undefined,
        status: status.value === 'ALL' ? undefined : status.value,
        sortBy: 'sortOrder',
        sortOrder: 'asc'
      }
    })
    rows.value = response.data.items
    meta.value = response.data.pagination ?? response.data.meta ?? {
      page: response.data.page ?? page.value,
      pageSize: response.data.pageSize ?? pageSize,
      total: response.data.total ?? response.data.items.length,
      totalPages: response.data.totalPages ?? (response.data.items.length < pageSize ? page.value : page.value + 1)
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = freshForm()
  formError.value = ''
  editorOpen.value = true
}

function openEdit(row: Record<string, unknown>) {
  editingId.value = Number(row.id)
  form.value = { ...freshForm(), ...structuredClone(row) }
  for (const field of props.fields) {
    if (field.kind !== 'datetime' || !form.value[field.key])
      continue
    const date = new Date(String(form.value[field.key]))
    form.value[field.key] = Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
  }
  formError.value = ''
  editorOpen.value = true
}

function validateForm() {
  const missing = props.fields.find(field => field.required && !String(form.value[field.key] ?? '').trim())
  if (missing) {
    formError.value = `请填写${missing.label}`
    return false
  }
  return true
}

async function save() {
  if (!validateForm())
    return
  saving.value = true
  formError.value = ''
  try {
    const body = Object.fromEntries(props.fields.map((field) => {
      const value = form.value[field.key]
      if (field.kind === 'string-list') {
        const items = stringList(field.key).map(item => item.trim()).filter(Boolean)
        return [field.key, items]
      }
      if (field.kind === 'steps') {
        const items = steps(field.key)
          .map(step => ({ title: step.title.trim(), description: step.description?.trim() || undefined }))
          .filter(step => step.title)
        return [field.key, items]
      }
      return [field.key, value === '' && !field.required ? null : value]
    }))
    const endpoint = editingId.value ? `${props.endpoint}/${editingId.value}` : props.endpoint
    await $fetch(endpoint, {
      method: editingId.value ? 'PATCH' : 'POST',
      body
    })
    editorOpen.value = false
    toast.add({ title: `${props.singular}已保存`, color: 'success' })
    await loadRows()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '保存失败，请检查表单'
  } finally {
    saving.value = false
  }
}

function requestDelete(row: Record<string, unknown>) {
  deletingRow.value = row
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deletingRow.value)
    return
  deleting.value = true
  try {
    await $fetch(`${props.endpoint}/${String(deletingRow.value.id)}`, { method: 'DELETE' })
    deleteOpen.value = false
    toast.add({ title: `${props.singular}已删除`, color: 'success' })
    if (rows.value.length === 1 && page.value > 1)
      page.value--
    await loadRows()
  } catch (error) {
    toast.add({
      title: '删除失败',
      description: error instanceof Error ? error.message : '请稍后重试',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

function setField(key: string, value: unknown) {
  form.value[key] = value
}

function stringList(key: string) {
  return Array.isArray(form.value[key]) ? form.value[key] as string[] : []
}

function addStringItem(key: string) {
  setField(key, [...stringList(key), ''])
}

function updateStringItem(key: string, index: number, value: string) {
  const list = [...stringList(key)]
  list[index] = value
  setField(key, list)
}

function removeStringItem(key: string, index: number) {
  setField(key, stringList(key).filter((_, itemIndex) => itemIndex !== index))
}

function steps(key: string) {
  return Array.isArray(form.value[key]) ? form.value[key] as StepValue[] : []
}

function addStep(key: string) {
  setField(key, [...steps(key), { title: '', description: '' }])
}

function updateStep(key: string, index: number, patch: Partial<StepValue>) {
  const list = steps(key).map((step, itemIndex) => itemIndex === index ? { ...step, ...patch } : step)
  setField(key, list)
}

function removeStep(key: string, index: number) {
  setField(key, steps(key).filter((_, itemIndex) => itemIndex !== index))
}

watch([keyword, status], () => {
  page.value = 1
  void loadRows()
})
watch(page, () => void loadRows())
onMounted(() => void loadRows())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          {{ title }}
        </h1>
        <p class="mt-1 text-sm text-muted">
          {{ description }}
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        class="justify-center"
        @click="openCreate"
      >
        新增{{ singular }}
      </UButton>
    </div>

    <UCard>
      <div class="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <UInput
          v-model="keyword"
          icon="i-lucide-search"
          placeholder="搜索名称或 Slug"
        />
        <USelect
          v-model="status"
          :items="statusSelectOptions"
        />
      </div>

      <div
        v-if="loading"
        class="space-y-3 py-4"
      >
        <USkeleton
          v-for="index in 5"
          :key="index"
          class="h-12 w-full"
        />
      </div>
      <UAlert
        v-else-if="loadError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        title="内容加载失败"
        :description="loadError"
        :actions="[{ label: '重新加载', onClick: loadRows }]"
      />
      <div
        v-else-if="rows.length === 0"
        class="flex flex-col items-center py-14 text-center"
      >
        <UIcon
          name="i-lucide-inbox"
          class="size-10 text-dimmed"
        />
        <p class="mt-3 font-medium text-highlighted">
          暂无{{ singular }}
        </p>
        <p class="mt-1 text-sm text-muted">
          调整筛选条件，或创建第一条内容。
        </p>
        <UButton
          class="mt-4"
          variant="soft"
          icon="i-lucide-plus"
          @click="openCreate"
        >
          新增{{ singular }}
        </UButton>
      </div>
      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full min-w-3xl text-left text-sm">
          <thead class="border-b border-default text-xs text-muted">
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                class="px-3 py-3 font-medium"
              >
                {{ column.label }}
              </th>
              <th class="px-3 py-3 text-right font-medium">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in rows"
              :key="String(row.id)"
              class="hover:bg-elevated/40"
            >
              <td
                v-for="column in columns"
                :key="column.key"
                class="max-w-64 px-3 py-4"
              >
                <UBadge
                  v-if="column.key === 'status'"
                  :color="badgeColor(row[column.key])"
                  variant="subtle"
                >
                  {{ statusLabel(row[column.key]) }}
                </UBadge>
                <span
                  v-else
                  class="line-clamp-2"
                >{{ displayValue(row, column.key) }}</span>
              </td>
              <td class="whitespace-nowrap px-3 py-4 text-right">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  aria-label="编辑"
                  @click="openEdit(row)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  aria-label="删除"
                  @click="requestDelete(row)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="meta.totalPages > 1"
        class="mt-5 flex flex-col gap-3 border-t border-default pt-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-muted">
          共 {{ meta.total }} 条，第 {{ meta.page }} / {{ meta.totalPages }} 页
        </p>
        <UPagination
          v-model:page="page"
          :total="meta.total"
          :items-per-page="pageSize"
        />
      </div>
    </UCard>

    <UModal
      v-model:open="editorOpen"
      :title="editorTitle"
      :description="`维护${singular}的展示内容和发布设置`"
    >
      <template #body>
        <form
          class="grid gap-5 md:grid-cols-2"
          @submit.prevent="save"
        >
          <div
            v-for="field in fields"
            :key="field.key"
            :class="field.wide || field.kind === 'textarea' || field.kind === 'richtext' || field.kind === 'string-list' || field.kind === 'steps' ? 'md:col-span-2' : ''"
          >
            <UFormField
              :label="field.label"
              :required="field.required"
              :description="field.description"
            >
              <UTextarea
                v-if="field.kind === 'textarea'"
                :model-value="String(form[field.key] ?? '')"
                :placeholder="field.placeholder"
                :rows="5"
                class="w-full"
                @update:model-value="setField(field.key, $event)"
              />
              <AdminRichTextEditor
                v-else-if="field.kind === 'richtext'"
                :model-value="String(form[field.key] ?? '')"
                :placeholder="field.placeholder || `请输入${field.label}`"
                @update:model-value="setField(field.key, $event)"
              />
              <UInput
                v-else-if="field.kind === 'number'"
                :model-value="Number(form[field.key] ?? 0)"
                type="number"
                class="w-full"
                @update:model-value="setField(field.key, Number($event))"
              />
              <USelect
                v-else-if="field.kind === 'select'"
                :model-value="selectModelValue(field.key)"
                :items="nonEmptySelectOptions(field.options)"
                class="w-full"
                @update:model-value="setField(field.key, $event)"
              />
              <USwitch
                v-else-if="field.kind === 'switch'"
                :model-value="Boolean(form[field.key])"
                @update:model-value="setField(field.key, $event)"
              />
              <UInput
                v-else-if="field.kind === 'datetime'"
                :model-value="String(form[field.key] ?? '')"
                type="datetime-local"
                class="w-full"
                @update:model-value="setField(field.key, $event)"
              />
              <div
                v-else-if="field.kind === 'string-list'"
                class="space-y-2"
              >
                <div
                  v-for="(item, index) in stringList(field.key)"
                  :key="index"
                  class="flex gap-2"
                >
                  <UInput
                    :model-value="item"
                    :placeholder="field.placeholder"
                    class="flex-1"
                    @update:model-value="updateStringItem(field.key, index, String($event))"
                  />
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="ghost"
                    aria-label="删除此项"
                    @click="removeStringItem(field.key, index)"
                  />
                </div>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-plus"
                  @click="addStringItem(field.key)"
                >
                  添加一项
                </UButton>
              </div>
              <div
                v-else-if="field.kind === 'steps'"
                class="space-y-3"
              >
                <div
                  v-for="(step, index) in steps(field.key)"
                  :key="index"
                  class="rounded-lg border border-default p-3"
                >
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-sm font-medium">步骤 {{ index + 1 }}</span>
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="sm"
                      aria-label="删除步骤"
                      @click="removeStep(field.key, index)"
                    />
                  </div>
                  <div class="grid gap-2">
                    <UInput
                      :model-value="step.title"
                      placeholder="步骤标题"
                      @update:model-value="updateStep(field.key, index, { title: String($event) })"
                    />
                    <UTextarea
                      :model-value="step.description ?? ''"
                      placeholder="步骤说明"
                      :rows="2"
                      @update:model-value="updateStep(field.key, index, { description: String($event) })"
                    />
                  </div>
                </div>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-plus"
                  @click="addStep(field.key)"
                >
                  添加流程步骤
                </UButton>
              </div>
              <UInput
                v-else
                :model-value="String(form[field.key] ?? '')"
                :placeholder="field.placeholder"
                class="w-full"
                @update:model-value="setField(field.key, $event)"
              />
            </UFormField>
          </div>
          <UAlert
            v-if="formError"
            class="md:col-span-2"
            color="error"
            variant="subtle"
            :description="formError"
          />
          <div class="flex justify-end gap-3 md:col-span-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="editorOpen = false"
            >
              取消
            </UButton>
            <UButton
              type="submit"
              :loading="saving"
            >
              保存
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <UModal
      v-model:open="deleteOpen"
      title="确认删除"
      :description="`删除后无法恢复，请确认是否删除“${String(deletingRow?.name ?? deletingRow?.title ?? '')}”。`"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="deleteOpen = false"
          >
            取消
          </UButton>
          <UButton
            color="error"
            :loading="deleting"
            @click="confirmDelete"
          >
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
