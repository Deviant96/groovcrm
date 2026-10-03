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
import PageHeader from '@/components/ui/PageHeader.vue';

const router = useRouter();
const loading = ref(true);
const today = ref<Prospect[]>([]);
const overdue = ref<Prospect[]>([]);
const stats = ref<{ total: number; withFollowUp: number; byStatus: Record<string, number> } | null>(
  null,
);

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
  <div class="space-y-6">
    <PageHeader title="Home" subtitle="Follow-ups and outreach at a glance">
      <template #actions>
        <div class="hidden gap-2 lg:flex">
          <Button
            label="Import CSV"
            icon="pi pi-upload"
            severity="secondary"
            @click="router.push('/import')"
          />
          <Button
            label="All prospects"
            icon="pi pi-users"
            @click="router.push('/prospects')"
          />
        </div>
      </template>
    </PageHeader>

    <div class="grid gap-4 sm:grid-cols-3">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="panel px-5 py-4">
          <Skeleton height="3rem" />
        </div>
      </template>
      <template v-else>
        <div class="panel px-5 py-4">
          <div class="text-[11px] font-medium uppercase tracking-wide text-gc-text-muted">
            Total prospects
          </div>
          <div class="tnum mt-1 text-3xl font-semibold text-gc-highlighted">
            {{ stats?.total ?? 0 }}
          </div>
        </div>
        <div class="panel px-5 py-4">
          <div class="text-[11px] font-medium uppercase tracking-wide text-gc-text-muted">
            Today's follow-ups
          </div>
          <div class="tnum mt-1 text-3xl font-semibold text-gc-primary">{{ today.length }}</div>
        </div>
        <div class="panel px-5 py-4">
          <div class="text-[11px] font-medium uppercase tracking-wide text-gc-text-muted">Overdue</div>
          <div class="tnum mt-1 text-3xl font-semibold text-amber-400">{{ overdue.length }}</div>
        </div>
      </template>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="panel">
        <h2 class="border-b border-gc-border-muted px-5 py-3 text-sm font-semibold text-gc-highlighted">
          Today's follow-ups
        </h2>
        <div v-if="loading" class="space-y-2 p-5">
          <Skeleton v-for="i in 3" :key="i" height="2.5rem" />
        </div>
        <div
          v-else-if="!today.length"
          class="px-5 py-10 text-center text-sm text-gc-text-muted"
        >
          Nothing due today. You're clear.
        </div>
        <ul v-else class="divide-y divide-gc-border-muted">
          <li
            v-for="p in today"
            :key="p.id"
            class="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gc-elevated/60"
            @click="router.push(`/prospects/${p.id}`)"
          >
            <div>
              <div class="text-sm font-medium text-gc-highlighted">{{ p.companyName }}</div>
              <div class="text-xs text-gc-text-muted">{{ formatDate(p.followUpDate) }}</div>
            </div>
            <Tag :value="STATUS_LABELS[p.status]" :severity="statusSeverity(p.status)" />
          </li>
        </ul>
      </section>

      <section class="panel">
        <h2 class="border-b border-gc-border-muted px-5 py-3 text-sm font-semibold text-gc-highlighted">
          Overdue follow-ups
        </h2>
        <div v-if="loading" class="space-y-2 p-5">
          <Skeleton v-for="i in 3" :key="i" height="2.5rem" />
        </div>
        <div
          v-else-if="!overdue.length"
          class="px-5 py-10 text-center text-sm text-gc-text-muted"
        >
          No overdue follow-ups.
        </div>
        <ul v-else class="divide-y divide-gc-border-muted">
          <li
            v-for="p in overdue"
            :key="p.id"
            class="flex cursor-pointer items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-gc-elevated/60"
            @click="router.push(`/prospects/${p.id}`)"
          >
            <div>
              <div class="text-sm font-medium text-gc-highlighted">{{ p.companyName }}</div>
              <div class="text-xs text-amber-400">Due {{ formatDate(p.followUpDate) }}</div>
            </div>
            <Tag :value="STATUS_LABELS[p.status]" :severity="statusSeverity(p.status)" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
