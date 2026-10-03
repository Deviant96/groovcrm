<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits<{
  newProspect: [];
  search: [];
}>();

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const nav = [
  { label: 'Home', to: '/', icon: 'pi pi-home' },
  { label: 'Prospects', to: '/prospects', icon: 'pi pi-users' },
  { label: 'Templates', to: '/templates', icon: 'pi pi-file' },
  { label: 'Import', to: '/import', icon: 'pi pi-upload' },
  { label: 'Settings', to: '/settings', icon: 'pi pi-cog' },
];

function isActive(to: string) {
  return route.path === to || (to !== '/' && route.path.startsWith(to));
}

const initials = computed(() => {
  const name = auth.user?.name?.trim() || 'U';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
});

async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>

<template>
  <aside
    class="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gc-border bg-gc-muted/30 lg:flex"
  >
    <div class="flex h-16 items-center gap-2.5 px-4">
      <RouterLink to="/" class="flex items-center gap-2.5">
        <span
          class="flex size-8 items-center justify-center rounded-xl bg-gc-primary/15 text-sm font-bold text-gc-primary"
        >
          G
        </span>
        <span class="text-[15px] font-semibold tracking-tight text-gc-highlighted">GroovCRM</span>
      </RouterLink>
    </div>

    <div class="px-3 pb-3">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-xl bg-gc-primary px-4 py-3 text-sm font-medium text-white transition-transform active:scale-[0.98]"
        @click="emit('newProspect')"
      >
        <span class="flex items-center gap-2">
          <i class="pi pi-plus text-xs" />
          New Prospect
        </span>
        <kbd
          class="hidden rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-medium opacity-70 xl:inline"
        >
          N
        </kbd>
      </button>
    </div>

    <nav class="flex flex-1 flex-col gap-0.5 px-3">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        :class="
          isActive(item.to)
            ? 'bg-gc-elevated text-gc-highlighted'
            : 'text-gc-text-muted hover:bg-gc-elevated/60 hover:text-gc-text'
        "
      >
        <i
          :class="[item.icon, 'text-xs', isActive(item.to) ? 'text-gc-primary' : '']"
        />
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="mt-auto border-t border-gc-border-muted p-3">
      <div class="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
        <span
          class="flex size-8 items-center justify-center rounded-xl bg-gc-elevated text-xs font-semibold text-gc-highlighted"
        >
          {{ initials }}
        </span>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-gc-highlighted">{{ auth.user?.name }}</div>
          <div class="truncate text-xs text-gc-dimmed">{{ auth.user?.email }}</div>
        </div>
      </div>
      <div class="flex gap-1">
        <Button
          icon="pi pi-search"
          severity="secondary"
          text
          rounded
          class="flex-1"
          v-tooltip.top="'Search (Ctrl+K)'"
          @click="emit('search')"
        />
        <Button
          icon="pi pi-sign-out"
          severity="secondary"
          text
          rounded
          class="flex-1"
          v-tooltip.top="'Sign out'"
          @click="logout"
        />
      </div>
    </div>
  </aside>
</template>
