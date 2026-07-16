<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

const email = ref('admin@groovcrm.local');
const password = ref('');
const rememberMe = ref(true);
const error = ref('');

async function submit() {
  error.value = '';
  try {
    await auth.login(email.value, password.value, rememberMe.value);
    toast.add({ severity: 'success', summary: 'Welcome back', life: 2000 });
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
    error.value = msg;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="gc-card w-full max-w-md p-8 gc-page">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-xl font-bold text-white">
          G
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">GroovCRM</h1>
        <p class="mt-1 text-sm text-gray-500">Prospect management & WhatsApp outreach</p>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <InputText v-model="email" type="email" class="w-full" autocomplete="username" autofocus />
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
          <Password v-model="password" class="w-full" input-class="w-full" :feedback="false" toggle-mask autocomplete="current-password" />
        </div>
        <div class="flex items-center gap-2">
          <Checkbox v-model="rememberMe" input-id="remember" binary />
          <label for="remember" class="text-sm text-gray-600">Remember me</label>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <Button type="submit" label="Sign in" class="w-full" :loading="auth.loading" />
      </form>
    </div>
  </div>
</template>
