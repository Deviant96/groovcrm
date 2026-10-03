<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts';
import GlobalSearch from '@/components/GlobalSearch.vue';
import NewProspectDialog from '@/components/NewProspectDialog.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import MobileNav from '@/components/layout/MobileNav.vue';

const searchOpen = ref(false);
const newProspectOpen = ref(false);

useGlobalShortcuts({
  onSearch: () => {
    searchOpen.value = true;
  },
  onEscape: () => {
    searchOpen.value = false;
  },
});

function onKey(e: KeyboardEvent) {
  if (e.key === 'n' || e.key === 'N') {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    newProspectOpen.value = true;
  }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="flex min-h-screen bg-gc-bg text-gc-text">
    <AppSidebar
      @new-prospect="newProspectOpen = true"
      @search="searchOpen = true"
    />

    <div class="flex min-w-0 flex-1 flex-col">
      <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        <RouterView class="fade-slide-up" />
      </main>
    </div>

    <MobileNav
      @new-prospect="newProspectOpen = true"
      @search="searchOpen = true"
    />

    <GlobalSearch v-model:visible="searchOpen" />
    <NewProspectDialog v-model:visible="newProspectOpen" />
  </div>
</template>
