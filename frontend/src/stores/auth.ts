import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { authApi, clearTokens, setTokens } from '@/services';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));

  async function login(email: string, password: string, rememberMe = false) {
    loading.value = true;
    try {
      const { data } = await authApi.login(email, password, rememberMe);
      setTokens(data.accessToken, data.refreshToken);
      user.value = data.user;
      return data.user;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    const token = localStorage.getItem('gc_access_token');
    if (!token) {
      initialized.value = true;
      return null;
    }
    try {
      const { data } = await authApi.me();
      user.value = data;
      return data;
    } catch {
      clearTokens();
      user.value = null;
      return null;
    } finally {
      initialized.value = true;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    clearTokens();
    user.value = null;
  }

  return { user, loading, initialized, isAuthenticated, login, fetchMe, logout };
});
