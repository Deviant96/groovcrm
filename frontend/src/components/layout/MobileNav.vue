<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import { useAuthStore } from '@/stores/auth';

const emit = defineEmits<{
  newProspect: [];
  search: [];
}>();

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const moreOpen = ref(false);

const primaryNav = [
  { label: 'Home', to: '/', icon: 'pi pi-home' },
  { label: 'Prospects', to: '/prospects', icon: 'pi pi-users' },
];

const moreLinks = [
  { label: 'Import', to: '/import', icon: 'pi pi-upload' },
  { label: 'Settings', to: '/settings', icon: 'pi pi-cog' },
];

function isActive(to: string) {
  return route.path === to || (to !== '/' && route.path.startsWith(to));
}

const templatesActive = computed(() => isActive('/templates'));
const moreActive = computed(() => moreLinks.some((l) => isActive(l.to)));

async function logout() {
  moreOpen.value = false;
  await auth.logout();
  router.push('/login');
}

function go(to: string) {
  moreOpen.value = false;
  router.push(to);
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 border-t border-gc-border bg-gc-bg/95 backdrop-blur lg:hidden pb-safe"
  >
    <div class="grid h-16 grid-cols-5 items-end px-1">
      <RouterLink
        v-for="item in primaryNav"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center justify-center gap-0.5 py-2"
        :class="isActive(item.to) ? 'text-gc-primary' : 'text-gc-text-muted'"
      >
        <i :class="[item.icon, 'text-base']" />
        <span class="text-[10px] font-medium">{{ item.label }}</span>
      </RouterLink>

      <button
        type="button"
        class="flex flex-col items-center justify-center"
        aria-label="New Prospect"
        @click="emit('newProspect')"
      >
        <span
          class="flex size-[3.25rem] -mt-5 items-center justify-center rounded-2xl bg-gc-primary text-white shadow-lg shadow-gc-primary/30 transition-transform active:scale-95"
        >
          <i class="pi pi-plus text-lg" />
        </span>
      </button>

      <RouterLink
        to="/templates"
        class="flex flex-col items-center justify-center gap-0.5 py-2"
        :class="templatesActive ? 'text-gc-primary' : 'text-gc-text-muted'"
      >
        <i class="pi pi-file text-base" />
        <span class="text-[10px] font-medium">Templates</span>
      </RouterLink>

      <button
        type="button"
        class="flex flex-col items-center justify-center gap-0.5 py-2"
        :class="moreActive || moreOpen ? 'text-gc-primary' : 'text-gc-text-muted'"
        @click="moreOpen = true"
      >
        <i class="pi pi-ellipsis-h text-base" />
        <span class="text-[10px] font-medium">More</span>
      </button>
    </div>
  </nav>

  <Dialog
    v-model:visible="moreOpen"
    modal
    header="More"
    :style="{ width: 'min(22rem, 92vw)' }"
    position="bottom"
    :pt="{ root: { class: 'mb-20!' } }"
  >
    <div class="flex flex-col gap-1">
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gc-highlighted transition-colors hover:bg-gc-elevated/60"
        @click="
          moreOpen = false;
          emit('search');
        "
      >
        <i class="pi pi-search text-gc-text-muted" />
        Search
        <kbd class="ml-auto text-[11px] text-gc-dimmed">Ctrl+K</kbd>
      </button>
      <button
        v-for="item in moreLinks"
        :key="item.to"
        type="button"
        class="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-gc-elevated/60"
        :class="isActive(item.to) ? 'text-gc-primary' : 'text-gc-highlighted'"
        @click="go(item.to)"
      >
        <i :class="[item.icon, 'text-gc-text-muted']" />
        {{ item.label }}
      </button>
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-gc-highlighted transition-colors hover:bg-gc-elevated/60"
        @click="logout"
      >
        <i class="pi pi-sign-out text-gc-text-muted" />
        Sign out
      </button>
    </div>
  </Dialog>
</template>
