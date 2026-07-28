<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = withDefaults(defineProps<{
  modelValue?: string
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: '请输入正文内容…'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editor = shallowRef<Editor | null>(null)
const editorVersion = ref(0)

function isActive(name: string, attributes?: Record<string, unknown>) {
  return editor.value?.isActive(name, attributes) ?? false
}

function run(command: (instance: Editor) => boolean) {
  if (!editor.value)
    return
  command(editor.value)
  editor.value.commands.focus()
}

watch(() => props.modelValue, (value) => {
  if (!editor.value || editor.value.getHTML() === value)
    return
  editor.value.commands.setContent(value || '', { emitUpdate: false })
})

onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [
      StarterKit
    ],
    editorProps: {
      attributes: {
        'class': 'min-h-80 px-4 py-4 text-sm leading-7 text-highlighted focus:outline-none',
        'aria-label': props.placeholder,
        'data-placeholder': props.placeholder
      }
    },
    onUpdate: ({ editor: instance }) => {
      emit('update:modelValue', instance.isEmpty ? '' : instance.getHTML())
    },
    onTransaction: () => {
      editorVersion.value++
    }
  })
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = null
})
</script>

<template>
  <ClientOnly>
    <div class="overflow-hidden rounded-lg border border-default bg-default">
      <div
        class="flex flex-wrap gap-1 border-b border-default bg-elevated/50 p-2"
        :data-editor-version="editorVersion"
      >
        <UButton
          icon="i-lucide-bold"
          color="neutral"
          :variant="isActive('bold') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="粗体"
          @click="run(instance => instance.chain().toggleBold().run())"
        />
        <UButton
          icon="i-lucide-italic"
          color="neutral"
          :variant="isActive('italic') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="斜体"
          @click="run(instance => instance.chain().toggleItalic().run())"
        />
        <UButton
          icon="i-lucide-strikethrough"
          color="neutral"
          :variant="isActive('strike') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="删除线"
          @click="run(instance => instance.chain().toggleStrike().run())"
        />
        <span class="mx-1 w-px self-stretch bg-default" />
        <UButton
          v-for="level in ([2, 3, 4] as const)"
          :key="level"
          color="neutral"
          :variant="isActive('heading', { level }) ? 'soft' : 'ghost'"
          size="sm"
          :label="`H${level}`"
          :aria-label="`${level} 级标题`"
          @click="run(instance => instance.chain().toggleHeading({ level }).run())"
        />
        <span class="mx-1 w-px self-stretch bg-default" />
        <UButton
          icon="i-lucide-list"
          color="neutral"
          :variant="isActive('bulletList') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="无序列表"
          @click="run(instance => instance.chain().toggleBulletList().run())"
        />
        <UButton
          icon="i-lucide-list-ordered"
          color="neutral"
          :variant="isActive('orderedList') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="有序列表"
          @click="run(instance => instance.chain().toggleOrderedList().run())"
        />
        <UButton
          icon="i-lucide-quote"
          color="neutral"
          :variant="isActive('blockquote') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="引用"
          @click="run(instance => instance.chain().toggleBlockquote().run())"
        />
        <UButton
          icon="i-lucide-code-2"
          color="neutral"
          :variant="isActive('codeBlock') ? 'soft' : 'ghost'"
          size="sm"
          aria-label="代码块"
          @click="run(instance => instance.chain().toggleCodeBlock().run())"
        />
        <span class="mx-1 w-px self-stretch bg-default" />
        <UButton
          icon="i-lucide-undo-2"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="撤销"
          :disabled="!editor?.can().chain().undo().run()"
          @click="run(instance => instance.chain().undo().run())"
        />
        <UButton
          icon="i-lucide-redo-2"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="重做"
          :disabled="!editor?.can().chain().redo().run()"
          @click="run(instance => instance.chain().redo().run())"
        />
      </div>
      <EditorContent
        v-if="editor"
        :editor="editor"
      />
      <div
        v-else
        class="flex min-h-80 items-center justify-center text-sm text-muted"
      >
        正在加载编辑器…
      </div>
    </div>
    <template #fallback>
      <USkeleton class="h-96 w-full" />
    </template>
  </ClientOnly>
</template>

<style scoped>
:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: var(--ui-text-dimmed);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.tiptap h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 1.5rem 0 0.75rem;
}

:deep(.tiptap h3) {
  font-size: 1.25rem;
  font-weight: 650;
  margin: 1.25rem 0 0.5rem;
}

:deep(.tiptap h4) {
  font-size: 1.1rem;
  font-weight: 650;
  margin: 1rem 0 0.5rem;
}

:deep(.tiptap ul) {
  list-style: disc;
  padding-left: 1.5rem;
}

:deep(.tiptap ol) {
  list-style: decimal;
  padding-left: 1.5rem;
}

:deep(.tiptap blockquote) {
  border-left: 3px solid var(--ui-border-accented);
  color: var(--ui-text-muted);
  margin: 1rem 0;
  padding-left: 1rem;
}

:deep(.tiptap pre) {
  background: var(--ui-bg-elevated);
  border-radius: 0.5rem;
  font-family: var(--font-mono);
  margin: 1rem 0;
  overflow-x: auto;
  padding: 1rem;
}
</style>
