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

const email = ref('');
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
  <div class="flex min-h-screen items-center justify-center bg-gc-bg px-4 text-gc-text">
    <div class="fade-slide-up w-full max-w-sm">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-3 flex size-10 items-center justify-center rounded-2xl bg-gc-primary/15 text-lg font-bold text-gc-primary"
        >
          G
        </div>
        <h1 class="text-xl font-semibold tracking-tight text-gc-highlighted">GroovCRM</h1>
        <p class="mt-1 text-sm text-gc-text-muted">Prospect management & WhatsApp outreach</p>
      </div>

      <div class="panel p-6 sm:p-7">
        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gc-text" for="login-email">Email</label>
            <InputText
              id="login-email"
              v-model="email"
              type="email"
              class="w-full"
              autocomplete="username"
              autofocus
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gc-text" for="login-password">
              Password
            </label>
            <Password
              id="login-password"
              v-model="password"
              class="w-full"
              input-class="w-full"
              :feedback="false"
              toggle-mask
              autocomplete="current-password"
            />
          </div>
          <div class="flex items-center gap-2">
            <Checkbox v-model="rememberMe" input-id="remember" binary />
            <label for="remember" class="text-sm text-gc-text-muted">Remember me</label>
          </div>
          <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
          <Button type="submit" label="Sign in" class="w-full" :loading="auth.loading" />
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-gc-dimmed">Calm outreach. Clear pipeline.</p>
    </div>
  </div>
</template>
