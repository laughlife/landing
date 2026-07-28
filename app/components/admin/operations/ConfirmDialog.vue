<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  danger?: boolean
}>(), {
  confirmLabel: '确认',
  loading: false,
  danger: false
})

defineEmits<{ confirm: [], cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="presentation"
      @click.self="$emit('cancel')"
    >
      <section
        class="w-full max-w-md rounded-2xl border border-default bg-default p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        :aria-label="title"
      >
        <div class="flex gap-3">
          <div
            class="grid size-10 shrink-0 place-items-center rounded-full"
            :class="danger ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'"
          >
            <UIcon
              :name="danger ? 'i-lucide-triangle-alert' : 'i-lucide-circle-help'"
              class="size-5"
            />
          </div>
          <div>
            <h2 class="font-semibold text-highlighted">
              {{ title }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-muted">
              {{ description }}
            </p>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            label="取消"
            :disabled="loading"
            @click="$emit('cancel')"
          />
          <UButton
            :color="danger ? 'error' : 'primary'"
            :label="confirmLabel"
            :loading="loading"
            @click="$emit('confirm')"
          />
        </div>
      </section>
    </div>
  </Teleport>
</template>
