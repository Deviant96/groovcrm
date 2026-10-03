<script setup lang="ts">
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gc-bg px-4 text-gc-text">
    <div class="panel fade-slide-up max-w-md p-10 text-center">
      <div class="text-6xl font-semibold text-gc-primary">404</div>
      <h1 class="mt-2 text-xl font-semibold text-gc-highlighted">Page not found</h1>
      <p class="mt-2 text-sm text-gc-text-muted">That route doesn’t exist in GroovCRM.</p>
      <Button class="mt-6" label="Back home" @click="router.push('/')" />
    </div>
  </div>
</template>
