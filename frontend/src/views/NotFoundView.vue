<script setup lang="ts">
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="gc-card max-w-md p-10 text-center gc-page">
      <div class="text-6xl font-semibold text-green-600">404</div>
      <h1 class="mt-2 text-xl font-semibold">Page not found</h1>
      <p class="mt-2 text-sm text-gray-500">That route doesn’t exist in GroovCRM.</p>
      <Button class="mt-6" label="Back home" @click="router.push('/')" />
    </div>
  </div>
</template>
