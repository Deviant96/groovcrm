<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { prospectApi } from '@/services';
import type { Prospect } from '@/types';
import { STATUS_LABELS } from '@/types';
import { formatDate, statusSeverity } from '@/utils';

const router = useRouter();
const loading = ref(true);
const today = ref<Prospect[]>([]);
const overdue = ref<Prospect[]>([]);
const stats = ref<{ total: number; withFollowUp: number; byStatus: Record<string, number> } | null>(null);

onMounted(async () => {
  try {
    const [fu, st] = await Promise.all([prospectApi.followUps(), prospectApi.stats()]);
    today.value = fu.data.today;
    overdue.value = fu.data.overdue;
    stats.value = st.data;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="gc-page space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Home</h1>
        <p class="text-sm text-gray-500">Follow-ups and outreach at a glance</p>
      </div>
      <div class="flex gap-2">
        <Button label="Import CSV" icon="pi pi-upload" severity="secondary" @click="router.push('/import')" />
        <Button label="All prospects" icon="pi pi-users" @click="router.push('/prospects')" />
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="gc-card p-4"><Skeleton height="3rem" /></div>
      </template>
      <template v-else>
        <div class="gc-card p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Total prospects</div>
          <div class="mt-1 text-3xl font-semibold">{{ stats?.total ?? 0 }}</div>
        </div>
        <div class="gc-card p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Today's follow-ups</div>
          <div class="mt-1 text-3xl font-semibold text-green-700">{{ today.length }}</div>
        </div>
        <div class="gc-card p-4">
          <div class="text-xs uppercase tracking-wide text-gray-500">Overdue</div>
          <div class="mt-1 text-3xl font-semibold text-amber-600">{{ overdue.length }}</div>
        </div>
      </template>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="gc-card p-5">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Today's Follow Ups</h2>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 3" :key="i" height="2.5rem" />
        </div>
        <div v-else-if="!today.length" class="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          Nothing due today. Nice.
        </div>
        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="p in today"
            :key="p.id"
            class="flex cursor-pointer items-center justify-between gap-3 py-3 transition hover:bg-green-50/50 -mx-2 px-2 rounded-lg"
            @click="router.push(`/prospects/${p.id}`)"
          >
            <div>
              <div class="font-medium">{{ p.companyName }}</div>
              <div class="text-xs text-gray-500">{{ formatDate(p.followUpDate) }}</div>
            </div>
            <Tag :value="STATUS_LABELS[p.status]" :severity="statusSeverity(p.status)" />
          </li>
        </ul>
      </section>

      <section class="gc-card p-5">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Overdue Follow Ups</h2>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="i in 3" :key="i" height="2.5rem" />
        </div>
        <div v-else-if="!overdue.length" class="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No overdue follow-ups.
        </div>
        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="p in overdue"
            :key="p.id"
            class="flex cursor-pointer items-center justify-between gap-3 py-3 transition hover:bg-amber-50/50 -mx-2 px-2 rounded-lg"
            @click="router.push(`/prospects/${p.id}`)"
          >
            <div>
              <div class="font-medium">{{ p.companyName }}</div>
              <div class="text-xs text-amber-700">Due {{ formatDate(p.followUpDate) }}</div>
            </div>
            <Tag :value="STATUS_LABELS[p.status]" :severity="statusSeverity(p.status)" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
