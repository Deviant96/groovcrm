import { defineStore } from 'pinia';
import { ref } from 'vue';
import { templateApi } from '@/services';
import type { Template } from '@/types';

export const useTemplateStore = defineStore('templates', () => {
  const items = ref<Template[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const { data } = await templateApi.list();
      items.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  }

  return { items, loading, fetchAll };
});
