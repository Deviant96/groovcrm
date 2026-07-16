<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useAuthStore } from '@/stores/auth';
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts';
import GlobalSearch from '@/components/GlobalSearch.vue';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const searchOpen = ref(false);

const nav = [
  { label: 'Home', to: '/', icon: 'pi pi-home' },
  { label: 'Prospects', to: '/prospects', icon: 'pi pi-users' },
  { label: 'Templates', to: '/templates', icon: 'pi pi-file' },
  { label: 'Import', to: '/import', icon: 'pi pi-upload' },
  { label: 'Settings', to: '/settings', icon: 'pi pi-cog' },
];

const activePath = computed(() => route.path);

useGlobalShortcuts({
  onSearch: () => {
    searchOpen.value = true;
  },
  onEscape: () => {
    searchOpen.value = false;
  },
});

async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2 shrink-0">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-green-600 text-white font-bold">G</span>
          <span class="text-lg font-semibold tracking-tight text-gray-900">GroovCRM</span>
        </RouterLink>

        <nav class="hidden md:flex items-center gap-1 ml-4">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="
              activePath === item.to || (item.to !== '/' && activePath.startsWith(item.to))
                ? 'bg-green-50 text-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            "
          >
            <i :class="item.icon" class="text-xs" />
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-2">
          <Button
            icon="pi pi-search"
            severity="secondary"
            text
            rounded
            v-tooltip.bottom="'Search (Ctrl+K)'"
            @click="searchOpen = true"
          />
          <span class="hidden sm:inline text-sm text-gray-500">{{ auth.user?.name }}</span>
          <Button icon="pi pi-sign-out" severity="secondary" text rounded @click="logout" />
        </div>
      </div>

      <nav class="md:hidden flex gap-1 overflow-x-auto px-3 pb-2">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium"
          :class="
            activePath === item.to || (item.to !== '/' && activePath.startsWith(item.to))
              ? 'bg-green-50 text-green-700'
              : 'text-gray-600'
          "
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6">
      <RouterView />
    </main>

    <GlobalSearch v-model:visible="searchOpen" />
  </div>
</template>
