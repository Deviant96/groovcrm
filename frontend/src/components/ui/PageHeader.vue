<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3 pb-4 pt-2 lg:pt-0">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold tracking-tight text-gc-highlighted lg:text-2xl">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="mt-1 text-sm text-gc-text-muted">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
