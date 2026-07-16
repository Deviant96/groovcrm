<script setup lang="ts">
import { ref } from 'vue';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/services';

const auth = useAuthStore();
const toast = useToast();
const currentPassword = ref('');
const newPassword = ref('');
const loading = ref(false);

async function changePassword() {
  loading.value = true;
  try {
    await authApi.changePassword(currentPassword.value, newPassword.value);
    toast.add({ severity: 'success', summary: 'Password updated. Please sign in again.', life: 3000 });
    currentPassword.value = '';
    newPassword.value = '';
    await auth.logout();
    location.href = '/login';
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to update password';
    toast.add({ severity: 'error', summary: msg, life: 3000 });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="gc-page max-w-lg space-y-4">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
      <p class="text-sm text-gray-500">Account preferences</p>
    </div>

    <section class="gc-card p-5 space-y-3">
      <h2 class="font-medium">Profile</h2>
      <div class="text-sm text-gray-600">
        <div><span class="text-gray-400">Name</span> · {{ auth.user?.name }}</div>
        <div><span class="text-gray-400">Email</span> · {{ auth.user?.email }}</div>
      </div>
    </section>

    <section class="gc-card p-5 space-y-3">
      <h2 class="font-medium">Change password</h2>
      <div>
        <label class="mb-1 block text-sm">Current password</label>
        <Password v-model="currentPassword" class="w-full" input-class="w-full" :feedback="false" toggle-mask />
      </div>
      <div>
        <label class="mb-1 block text-sm">New password</label>
        <Password v-model="newPassword" class="w-full" input-class="w-full" toggle-mask />
      </div>
      <Button label="Update password" :loading="loading" @click="changePassword" />
    </section>

    <section class="gc-card p-5 text-sm text-gray-500">
      <p>Keyboard shortcuts</p>
      <ul class="mt-2 list-disc pl-5 space-y-1">
        <li><kbd class="rounded bg-gray-100 px-1">Ctrl</kbd>+<kbd class="rounded bg-gray-100 px-1">K</kbd> or <kbd class="rounded bg-gray-100 px-1">/</kbd> — global search</li>
        <li>Double-click fields on prospect detail to edit</li>
        <li><kbd class="rounded bg-gray-100 px-1">Enter</kbd> save · <kbd class="rounded bg-gray-100 px-1">Esc</kbd> cancel</li>
      </ul>
    </section>
  </div>
</template>
