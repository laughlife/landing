<script setup lang="ts">
type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED'

interface CategoryOption {
  id: number | string
  name: string
  parentId?: number | string | null
  children?: CategoryOption[]
}

interface ProductImageInput {
  mediaId?: number
  imageUrl: string
  altText: string
}

interface SpecificationItem {
  label: string
  value: string
}

interface SpecificationGroup {
  group: string
  items: SpecificationItem[]
}

export interface ProductFormValue {
  categoryId?: number
  name: string
  slug: string
  model: string
  subtitle: string
  summary: string
  description: string
  coverImage: string
  videoUrl: string
  features: string[]
  applications: string[]
  specifications: SpecificationGroup[]
  images: ProductImageInput[]
  sortOrder: number
  isFeatured: boolean
  status: ProductStatus
  seoTitle: string
  seoKeywords: string
  seoDescription: string
}

const props = defineProps<{
  modelValue: ProductFormValue
  categories: CategoryOption[]
  submitting?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ProductFormValue]
  'submit': []
  'cancel': []
}>()

const form = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const categoryItems = computed(() => {
  const items: Array<{ label: string, value: number }> = []
  const visit = (categories: CategoryOption[], depth = 0) => {
    for (const category of categories) {
      items.push({
        label: `${depth ? '　'.repeat(depth) + '└ ' : ''}${category.name}`,
        value: Number(category.id)
      })
      if (category.children?.length) {
        visit(category.children, depth + 1)
      }
    }
  }
  visit(props.categories)
  return items
})

const statusItems = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已停用', value: 'DISABLED' }
]

function addTextItem(field: 'features' | 'applications') {
  form.value[field].push('')
}

function removeTextItem(field: 'features' | 'applications', index: number) {
  form.value[field].splice(index, 1)
}

function moveTextItem(field: 'features' | 'applications', index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.value[field].length) return
  const [item] = form.value[field].splice(index, 1)
  if (item !== undefined) form.value[field].splice(target, 0, item)
}

function addSpecificationGroup() {
  form.value.specifications.push({
    group: '',
    items: [{ label: '', value: '' }]
  })
}

function removeSpecificationGroup(index: number) {
  form.value.specifications.splice(index, 1)
}

function moveSpecificationGroup(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.value.specifications.length) return
  const [group] = form.value.specifications.splice(index, 1)
  if (group) form.value.specifications.splice(target, 0, group)
}

function addSpecificationItem(groupIndex: number) {
  form.value.specifications[groupIndex]?.items.push({ label: '', value: '' })
}

function removeSpecificationItem(groupIndex: number, itemIndex: number) {
  form.value.specifications[groupIndex]?.items.splice(itemIndex, 1)
}

function moveSpecificationItem(groupIndex: number, itemIndex: number, direction: -1 | 1) {
  const items = form.value.specifications[groupIndex]?.items
  if (!items) return
  const target = itemIndex + direction
  if (target < 0 || target >= items.length) return
  const [item] = items.splice(itemIndex, 1)
  if (item) items.splice(target, 0, item)
}

function addImage() {
  form.value.images.push({ mediaId: undefined, imageUrl: '', altText: '' })
}

function removeImage(index: number) {
  form.value.images.splice(index, 1)
}

function moveImage(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.value.images.length) return
  const [image] = form.value.images.splice(index, 1)
  if (image) form.value.images.splice(target, 0, image)
}
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="emit('submit')"
  >
    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            基础信息
          </h2>
          <p class="mt-1 text-sm text-muted">
            填写产品名称、所属分类和前台摘要。
          </p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField
          label="产品名称"
          required
        >
          <UInput
            v-model="form.name"
            class="w-full"
            placeholder="例如：工业级不锈钢管件"
          />
        </UFormField>
        <UFormField
          label="URL 标识"
          required
          hint="只能使用小写字母、数字和连字符"
        >
          <UInput
            v-model="form.slug"
            class="w-full"
            placeholder="industrial-pipe-fitting"
          />
        </UFormField>
        <UFormField
          label="所属分类"
          required
        >
          <USelect
            v-model="form.categoryId"
            :items="categoryItems"
            class="w-full"
            placeholder="请选择分类"
          />
        </UFormField>
        <UFormField label="产品型号">
          <UInput
            v-model="form.model"
            class="w-full"
            placeholder="例如：WY-2026"
          />
        </UFormField>
        <UFormField
          label="副标题"
          class="md:col-span-2"
        >
          <UInput
            v-model="form.subtitle"
            class="w-full"
            placeholder="产品核心定位或卖点"
          />
        </UFormField>
        <UFormField
          label="产品摘要"
          class="md:col-span-2"
        >
          <UTextarea
            v-model="form.summary"
            :rows="4"
            class="w-full"
            placeholder="用于列表页和详情页首屏的简短介绍"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            产品媒体
          </h2>
          <p class="mt-1 text-sm text-muted">
            使用媒体库返回的站内 URL；详情图同时保留媒体 ID 以便后端建立引用。
          </p>
        </div>
      </template>

      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="封面图 URL">
          <UInput
            v-model="form.coverImage"
            class="w-full"
            placeholder="/uploads/2026/07/example.webp"
          />
        </UFormField>
        <UFormField label="视频 URL">
          <UInput
            v-model="form.videoUrl"
            class="w-full"
            placeholder="https://..."
          />
        </UFormField>
      </div>

      <div
        v-if="form.coverImage"
        class="mt-4 overflow-hidden rounded-xl border border-default bg-muted/20"
      >
        <img
          :src="form.coverImage"
          alt="产品封面预览"
          class="h-48 w-full object-contain"
        >
      </div>

      <div class="mt-5 flex items-center justify-between gap-3">
        <h3 class="text-sm font-medium text-highlighted">
          详情图片
        </h3>
        <UButton
          type="button"
          icon="i-lucide-plus"
          label="添加图片"
          color="neutral"
          variant="soft"
          size="sm"
          @click="addImage"
        />
      </div>

      <div
        v-if="form.images.length"
        class="mt-3 space-y-3"
      >
        <div
          v-for="(image, index) in form.images"
          :key="index"
          class="grid gap-3 rounded-xl border border-default p-3 md:grid-cols-[7rem_1fr_1fr_auto]"
        >
          <div class="flex h-20 items-center justify-center overflow-hidden rounded-lg bg-muted/40">
            <img
              v-if="image.imageUrl"
              :src="image.imageUrl"
              :alt="image.altText || `详情图 ${index + 1}`"
              class="h-full w-full object-cover"
            >
            <UIcon
              v-else
              name="i-lucide-image"
              class="size-6 text-dimmed"
            />
          </div>
          <UFormField label="媒体 ID">
            <UInput
              v-model.number="image.mediaId"
              type="number"
              min="1"
              class="w-full"
              placeholder="媒体库 ID"
            />
          </UFormField>
          <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <UFormField label="图片 URL">
              <UInput
                v-model="image.imageUrl"
                class="w-full"
                placeholder="/uploads/..."
              />
            </UFormField>
            <UFormField label="替代文本">
              <UInput
                v-model="image.altText"
                class="w-full"
                placeholder="图片内容描述"
              />
            </UFormField>
          </div>
          <div class="flex items-center gap-1 md:flex-col">
            <UButton
              type="button"
              icon="i-lucide-arrow-up"
              aria-label="上移图片"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="index === 0"
              @click="moveImage(index, -1)"
            />
            <UButton
              type="button"
              icon="i-lucide-arrow-down"
              aria-label="下移图片"
              color="neutral"
              variant="ghost"
              size="sm"
              :disabled="index === form.images.length - 1"
              @click="moveImage(index, 1)"
            />
            <UButton
              type="button"
              icon="i-lucide-trash-2"
              aria-label="删除图片"
              color="error"
              variant="ghost"
              size="sm"
              @click="removeImage(index)"
            />
          </div>
        </div>
      </div>
      <div
        v-else
        class="mt-3 rounded-xl border border-dashed border-default px-4 py-8 text-center text-sm text-muted"
      >
        暂无详情图片
      </div>
    </UCard>

    <div class="grid gap-6 xl:grid-cols-2">
      <UCard
        v-for="field in (['features', 'applications'] as const)"
        :key="field"
      >
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ field === 'features' ? '产品特点' : '应用场景' }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                逐项填写，前台将按列表展示。
              </p>
            </div>
            <UButton
              type="button"
              icon="i-lucide-plus"
              label="添加"
              color="neutral"
              variant="soft"
              size="sm"
              @click="addTextItem(field)"
            />
          </div>
        </template>

        <div
          v-if="form[field].length"
          class="space-y-2"
        >
          <div
            v-for="(_, index) in form[field]"
            :key="index"
            class="flex items-center gap-2"
          >
            <UInput
              v-model="form[field][index]"
              class="flex-1"
              :placeholder="field === 'features' ? '例如：耐腐蚀、易维护' : '例如：食品加工生产线'"
            />
            <UButton
              type="button"
              icon="i-lucide-arrow-up"
              aria-label="上移"
              color="neutral"
              variant="ghost"
              :disabled="index === 0"
              @click="moveTextItem(field, index, -1)"
            />
            <UButton
              type="button"
              icon="i-lucide-arrow-down"
              aria-label="下移"
              color="neutral"
              variant="ghost"
              :disabled="index === form[field].length - 1"
              @click="moveTextItem(field, index, 1)"
            />
            <UButton
              type="button"
              icon="i-lucide-x"
              aria-label="删除"
              color="error"
              variant="ghost"
              @click="removeTextItem(field, index)"
            />
          </div>
        </div>
        <p
          v-else
          class="text-sm text-muted"
        >
          尚未添加内容。
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-highlighted">
              规格参数
            </h2>
            <p class="mt-1 text-sm text-muted">
              按分组维护参数，无需手写 JSON。
            </p>
          </div>
          <UButton
            type="button"
            icon="i-lucide-plus"
            label="添加分组"
            color="neutral"
            variant="soft"
            size="sm"
            @click="addSpecificationGroup"
          />
        </div>
      </template>

      <div
        v-if="form.specifications.length"
        class="space-y-4"
      >
        <div
          v-for="(group, groupIndex) in form.specifications"
          :key="groupIndex"
          class="rounded-xl border border-default p-4"
        >
          <div class="flex flex-wrap items-end gap-2">
            <UFormField
              label="分组名称"
              class="min-w-60 flex-1"
            >
              <UInput
                v-model="group.group"
                class="w-full"
                placeholder="例如：基础参数"
              />
            </UFormField>
            <UButton
              type="button"
              icon="i-lucide-arrow-up"
              aria-label="上移分组"
              color="neutral"
              variant="ghost"
              :disabled="groupIndex === 0"
              @click="moveSpecificationGroup(groupIndex, -1)"
            />
            <UButton
              type="button"
              icon="i-lucide-arrow-down"
              aria-label="下移分组"
              color="neutral"
              variant="ghost"
              :disabled="groupIndex === form.specifications.length - 1"
              @click="moveSpecificationGroup(groupIndex, 1)"
            />
            <UButton
              type="button"
              icon="i-lucide-trash-2"
              label="删除分组"
              color="error"
              variant="ghost"
              @click="removeSpecificationGroup(groupIndex)"
            />
          </div>

          <div class="mt-4 space-y-2">
            <div
              v-for="(item, itemIndex) in group.items"
              :key="itemIndex"
              class="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
            >
              <UInput
                v-model="item.label"
                placeholder="参数名，如：材质"
              />
              <UInput
                v-model="item.value"
                placeholder="参数值，如：304 不锈钢"
              />
              <div class="flex gap-1">
                <UButton
                  type="button"
                  icon="i-lucide-arrow-up"
                  aria-label="上移参数"
                  color="neutral"
                  variant="ghost"
                  :disabled="itemIndex === 0"
                  @click="moveSpecificationItem(groupIndex, itemIndex, -1)"
                />
                <UButton
                  type="button"
                  icon="i-lucide-arrow-down"
                  aria-label="下移参数"
                  color="neutral"
                  variant="ghost"
                  :disabled="itemIndex === group.items.length - 1"
                  @click="moveSpecificationItem(groupIndex, itemIndex, 1)"
                />
                <UButton
                  type="button"
                  icon="i-lucide-x"
                  aria-label="删除参数"
                  color="error"
                  variant="ghost"
                  @click="removeSpecificationItem(groupIndex, itemIndex)"
                />
              </div>
            </div>
          </div>
          <UButton
            type="button"
            icon="i-lucide-plus"
            label="添加参数"
            color="neutral"
            variant="link"
            class="mt-2"
            @click="addSpecificationItem(groupIndex)"
          />
        </div>
      </div>
      <p
        v-else
        class="text-sm text-muted"
      >
        尚未添加规格参数。
      </p>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            详细介绍
          </h2>
          <p class="mt-1 text-sm text-muted">
            可填写经过清理的 HTML 富文本内容。
          </p>
        </div>
      </template>
      <AdminRichTextEditor
        v-model="form.description"
        placeholder="请输入产品详细介绍…"
      />
    </UCard>

    <div class="grid gap-6 xl:grid-cols-2">
      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">
            发布设置
          </h2>
        </template>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="内容状态">
            <USelect
              v-model="form.status"
              :items="statusItems"
              class="w-full"
            />
          </UFormField>
          <UFormField label="排序值">
            <UInput
              v-model.number="form.sortOrder"
              type="number"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="推荐产品"
            class="sm:col-span-2"
          >
            <USwitch
              v-model="form.isFeatured"
              label="在官网推荐区域展示"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-base font-semibold text-highlighted">
            SEO 设置
          </h2>
        </template>
        <div class="space-y-4">
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
              placeholder="多个关键词使用逗号分隔"
            />
          </UFormField>
          <UFormField label="SEO 描述">
            <UTextarea
              v-model="form.seoDescription"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>
    </div>

    <div class="sticky bottom-4 z-10 flex justify-end gap-3 rounded-xl border border-default bg-default/90 p-4 shadow-lg backdrop-blur">
      <UButton
        type="button"
        label="取消"
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      />
      <UButton
        type="submit"
        icon="i-lucide-save"
        :label="submitLabel || '保存产品'"
        :loading="submitting"
      />
    </div>
  </form>
</template>
