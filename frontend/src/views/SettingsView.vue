<script setup lang="ts">
import { ref } from 'vue';
import Password from 'primevue/password';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/services';
import PageHeader from '@/components/ui/PageHeader.vue';

const auth = useAuthStore();
const toast = useToast();
const currentPassword = ref('');
const newPassword = ref('');
const loading = ref(false);

async function changePassword() {
  loading.value = true;
  try {
    await authApi.changePassword(currentPassword.value, newPassword.value);
    toast.add({
      severity: 'success',
      summary: 'Password updated. Please sign in again.',
      life: 3000,
    });
    currentPassword.value = '';
    newPassword.value = '';
    await auth.logout();
    location.href = '/login';
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { error?: string } } })?.response?.data?.error ??
      'Failed to update password';
    toast.add({ severity: 'error', summary: msg, life: 3000 });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg space-y-4">
    <PageHeader title="Settings" subtitle="Account preferences" />

    <section class="panel space-y-3 p-5">
      <h2 class="font-medium text-gc-highlighted">Profile</h2>
      <div class="text-sm text-gc-text-muted">
        <div>
          <span class="text-gc-dimmed">Name</span> · {{ auth.user?.name }}
        </div>
        <div>
          <span class="text-gc-dimmed">Email</span> · {{ auth.user?.email }}
        </div>
      </div>
    </section>

    <section class="panel space-y-3 p-5">
      <h2 class="font-medium text-gc-highlighted">Change password</h2>
      <div>
        <label class="mb-1 block text-sm text-gc-text">Current password</label>
        <Password
          v-model="currentPassword"
          class="w-full"
          input-class="w-full"
          :feedback="false"
          toggle-mask
        />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gc-text">New password</label>
        <Password v-model="newPassword" class="w-full" input-class="w-full" toggle-mask />
      </div>
      <Button label="Update password" :loading="loading" @click="changePassword" />
    </section>

    <section class="panel p-5 text-sm text-gc-text-muted">
      <p class="font-medium text-gc-highlighted">Keyboard shortcuts</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li>
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">Ctrl</kbd>+
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">K</kbd>
          or
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">/</kbd>
          — global search
        </li>
        <li>
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">N</kbd>
          — new prospect
        </li>
        <li>Double-click fields on prospect detail to edit</li>
        <li>
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">Enter</kbd>
          save ·
          <kbd class="rounded border border-gc-border bg-gc-elevated px-1 text-gc-text">Esc</kbd>
          cancel
        </li>
      </ul>
    </section>
  </div>
</template>
