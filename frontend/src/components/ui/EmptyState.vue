<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  icon?: string;
}>();
</script>

<template>
  <div class="panel px-6 py-14 text-center">
    <div
      class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-gc-elevated text-gc-text-muted"
    >
      <i :class="[icon || 'pi pi-inbox', 'text-xl']" />
    </div>
    <div class="text-[15px] font-medium text-gc-highlighted">{{ title }}</div>
    <p v-if="description" class="mx-auto mt-1 max-w-sm text-sm text-gc-text-muted">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5">
      <slot />
    </div>
  </div>
</template>
