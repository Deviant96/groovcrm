import { defineStore } from 'pinia';
import { ref } from 'vue';
import { prospectApi } from '@/services';
import type { Paginated, Prospect, ProspectFilters } from '@/types';

export const useProspectStore = defineStore('prospects', () => {
  const list = ref<Paginated<Prospect> | null>(null);
  const current = ref<Prospect | null>(null);
  const loading = ref(false);
  const filters = ref<ProspectFilters>({
    page: 1,
    pageSize: 25,
    sortBy: 'updatedAt',
    sortDir: 'desc',
  });
  const selected = ref<Prospect[]>([]);

  async function fetchList(overrides: ProspectFilters = {}) {
    loading.value = true;
    try {
      filters.value = { ...filters.value, ...overrides };
      const { data } = await prospectApi.list(filters.value);
      list.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchOne(id: string) {
    loading.value = true;
    try {
      const { data } = await prospectApi.get(id);
      current.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function updateOne(id: string, payload: Partial<Prospect>) {
    const { data } = await prospectApi.update(id, payload);
    if (current.value?.id === id) current.value = { ...current.value, ...data };
    return data;
  }

  return { list, current, loading, filters, selected, fetchList, fetchOne, updateOne };
});
