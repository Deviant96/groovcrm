<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { useDebounceFn } from '@vueuse/core';
import { prospectApi } from '@/services';
import type { Prospect } from '@/types';
import { STATUS_LABELS } from '@/types';

const visible = defineModel<boolean>('visible', { default: false });
const router = useRouter();
const query = ref('');
const results = ref<Prospect[]>([]);
const loading = ref(false);

const search = useDebounceFn(async () => {
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const { data } = await prospectApi.search(query.value);
    results.value = data;
  } finally {
    loading.value = false;
  }
}, 200);

watch(visible, (v) => {
  if (v) {
    query.value = '';
    results.value = [];
    setTimeout(() => {
      const el = document.querySelector('.gc-global-search input') as HTMLInputElement | null;
      el?.focus();
    }, 50);
  }
});

watch(query, () => search());

function open(p: Prospect) {
  visible.value = false;
  router.push(`/prospects/${p.id}`);
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Search prospects"
    class="w-full max-w-xl"
    :pt="{ root: { class: 'gc-global-search' } }"
  >
    <InputText
      v-model="query"
      placeholder="Company, Instagram, phone, website…"
      class="w-full"
      autofocus
    />
    <div class="mt-3 max-h-80 overflow-auto">
      <div v-if="loading" class="text-sm text-gray-500 py-4 text-center">Searching…</div>
      <div v-else-if="query && !results.length" class="text-sm text-gray-500 py-4 text-center">No results</div>
      <button
        v-for="p in results"
        :key="p.id"
        type="button"
        class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition hover:bg-green-50"
        @click="open(p)"
      >
        <div>
          <div class="font-medium text-gray-900">{{ p.companyName }}</div>
          <div class="text-xs text-gray-500">
            {{ p.instagramHandle ? `@${p.instagramHandle}` : '—' }}
            ·
            {{ p.phoneNumber || '—' }}
          </div>
        </div>
        <span class="text-xs text-gray-500">{{ STATUS_LABELS[p.status] }}</span>
      </button>
    </div>
  </Dialog>
</template>
