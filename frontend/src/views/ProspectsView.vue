<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';
import Skeleton from 'primevue/skeleton';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useDebounceFn, useLocalStorage } from '@vueuse/core';
import { useProspectStore } from '@/stores/prospects';
import { exportApi, prospectApi } from '@/services';
import { STATUS_LABELS, STATUS_OPTIONS, type Prospect, type ProspectStatus } from '@/types';
import { formatDate, statusSeverity } from '@/utils';
import WhatsAppDialog from '@/components/WhatsAppDialog.vue';

const store = useProspectStore();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const search = ref('');
const status = ref<ProspectStatus | null>(null);
const hasWebsite = ref<boolean | null>(null);
const followUp = ref<string | null>(null);
const bulkStatus = ref<ProspectStatus | null>(null);
const waProspect = ref<Prospect | null>(null);
const waVisible = ref(false);

const columnOptions = [
  { field: 'companyName', header: 'Company' },
  { field: 'instagramHandle', header: 'Instagram' },
  { field: 'phoneNumber', header: 'Phone' },
  { field: 'website', header: 'Website' },
  { field: 'hasWebsite', header: 'Has Website' },
  { field: 'score', header: 'Score' },
  { field: 'status', header: 'Status' },
  { field: 'followUpDate', header: 'Follow Up' },
  { field: 'lastContactDate', header: 'Last Contact' },
];

const defaultVisibleColumns = columnOptions.map((c) => c.field);
const validColumnFields = new Set(defaultVisibleColumns);
const visibleColumns = useLocalStorage<string[]>('gc_prospect_visible_columns', [...defaultVisibleColumns]);
visibleColumns.value = visibleColumns.value.filter((f) => validColumnFields.has(f));
if (!visibleColumns.value.length) {
  visibleColumns.value = [...defaultVisibleColumns];
}
const selected = ref<Prospect[]>([]);

const yesNo = [
  { label: 'Any', value: null },
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const followUpOptions = [
  { label: 'Any', value: null },
  { label: 'Today', value: 'today' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'None', value: 'none' },
];

const first = computed({
  get: () => ((store.filters.page ?? 1) - 1) * (store.filters.pageSize ?? 25),
  set: (v: number) => {
    const pageSize = store.filters.pageSize ?? 25;
    void load({ page: Math.floor(v / pageSize) + 1 });
  },
});

async function load(overrides = {}) {
  await store.fetchList({
    search: search.value || undefined,
    status: status.value || undefined,
    hasWebsite: hasWebsite.value ?? undefined,
    followUp: (followUp.value as 'today' | 'overdue' | 'upcoming' | 'none') || undefined,
    ...overrides,
  });
}

const debouncedSearch = useDebounceFn(() => load({ page: 1 }), 250);

onMounted(() => load());

watch([status, hasWebsite, followUp], () => load({ page: 1 }));
watch(search, () => debouncedSearch());

function onSort(e: { sortField?: string | ((item: unknown) => string) | undefined; sortOrder?: number | null | undefined }) {
  if (!e.sortField || typeof e.sortField !== 'string') return;
  void load({
    sortBy: e.sortField,
    sortDir: e.sortOrder === 1 ? 'asc' : 'desc',
    page: 1,
  });
}

function openRow(e: { data: Prospect }) {
  router.push(`/prospects/${e.data.id}`);
}

function showCol(field: string) {
  return visibleColumns.value.includes(field);
}

async function applyBulkStatus() {
  if (!bulkStatus.value || !selected.value.length) return;
  await prospectApi.bulkStatus(
    selected.value.map((p) => p.id),
    bulkStatus.value,
  );
  toast.add({ severity: 'success', summary: `Updated ${selected.value.length} prospects`, life: 2500 });
  selected.value = [];
  bulkStatus.value = null;
  await load();
}

function confirmBulkDelete() {
  confirm.require({
    message: `Delete ${selected.value.length} prospects? This cannot be undone.`,
    header: 'Confirm delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await prospectApi.bulkDelete(selected.value.map((p) => p.id));
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
      selected.value = [];
      await load();
    },
  });
}

async function downloadExport() {
  await exportApi.downloadCsv();
  toast.add({ severity: 'success', summary: 'Export started', life: 2000 });
}

function openWhatsApp(p: Prospect, e: Event) {
  e.stopPropagation();
  waProspect.value = p;
  waVisible.value = true;
}
</script>

<template>
  <div class="gc-page space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Prospects</h1>
        <p class="text-sm text-gray-500">Search, filter, and outreach from one table</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button label="Export CSV" icon="pi pi-download" severity="secondary" @click="downloadExport" />
        <Button label="Import" icon="pi pi-upload" severity="secondary" @click="router.push('/import')" />
      </div>
    </div>

    <div class="gc-card p-4 space-y-3">
      <div class="flex flex-wrap gap-3">
        <span class="p-input-icon-left grow min-w-[200px]">
          <InputText v-model="search" placeholder="Search anything…" class="w-full" />
        </span>
        <Select v-model="status" :options="[{ label: 'All statuses', value: null }, ...STATUS_OPTIONS]" option-label="label" option-value="value" placeholder="Status" class="min-w-[160px]" show-clear />
        <Select v-model="hasWebsite" :options="yesNo" option-label="label" option-value="value" placeholder="Has website" class="min-w-[140px]" />
        <Select v-model="followUp" :options="followUpOptions" option-label="label" option-value="value" placeholder="Follow up" class="min-w-[140px]" />
        <MultiSelect
          v-model="visibleColumns"
          :options="columnOptions"
          option-label="header"
          option-value="field"
          placeholder="Columns"
          display="chip"
          class="min-w-[180px]"
        />
      </div>

      <div v-if="selected.length" class="flex flex-wrap items-center gap-2 rounded-xl bg-green-50 px-3 py-2">
        <span class="text-sm font-medium text-green-800">{{ selected.length }} selected</span>
        <Select v-model="bulkStatus" :options="STATUS_OPTIONS" option-label="label" option-value="value" placeholder="Change status" class="min-w-[160px]" />
        <Button label="Apply" size="small" :disabled="!bulkStatus" @click="applyBulkStatus" />
        <Button label="Delete" size="small" severity="danger" outlined @click="confirmBulkDelete" />
        <Button
          v-if="selected[0]"
          label="WhatsApp"
          size="small"
          severity="success"
          outlined
          @click="openWhatsApp(selected[0], $event)"
        />
      </div>

      <DataTable
        v-model:selection="selected"
        :value="store.list?.items ?? []"
        :loading="store.loading"
        data-key="id"
        paginator
        lazy
        :rows="store.filters.pageSize ?? 25"
        :total-records="store.list?.total ?? 0"
        v-model:first="first"
        :rows-per-page-options="[10, 25, 50, 100]"
        sort-mode="single"
        removable-sort
        resizable-columns
        column-resize-mode="expand"
        scrollable
        scroll-height="65vh"
        selection-mode="multiple"
        :meta-key-selection="false"
        class="text-sm"
        @row-dblclick="openRow"
        @row-click="openRow"
        @sort="onSort"
        @page="(e) => load({ page: (e.page ?? 0) + 1, pageSize: e.rows })"
      >
        <template #empty>
          <div class="py-10 text-center text-gray-500">
            <div v-if="store.loading"><Skeleton height="2rem" class="mb-2" /><Skeleton height="2rem" /></div>
            <div v-else>No prospects yet. Import a CSV to get started.</div>
          </div>
        </template>

        <Column selection-mode="multiple" header-style="width: 3rem" frozen />
        <Column v-if="showCol('companyName')" field="companyName" header="Company" sortable style="min-width: 160px" frozen>
          <template #body="{ data }">
            <span class="font-medium text-gray-900">{{ data.companyName }}</span>
          </template>
        </Column>
        <Column v-if="showCol('instagramHandle')" field="instagramHandle" header="Instagram" sortable style="min-width: 120px">
          <template #body="{ data }">{{ data.instagramHandle ? `@${data.instagramHandle}` : '—' }}</template>
        </Column>
        <Column v-if="showCol('phoneNumber')" field="phoneNumber" header="Phone" sortable style="min-width: 120px" />
        <Column v-if="showCol('website')" field="website" header="Website" sortable style="min-width: 140px">
          <template #body="{ data }">
            <span class="truncate block max-w-[180px]">{{ data.website || '—' }}</span>
          </template>
        </Column>
        <Column v-if="showCol('hasWebsite')" field="hasWebsite" header="Has Website" sortable style="min-width: 110px">
          <template #body="{ data }">
            <i :class="data.hasWebsite ? 'pi pi-check text-green-600' : 'pi pi-times text-gray-300'" />
          </template>
        </Column>
        <Column v-if="showCol('score')" field="score" header="Score" sortable style="min-width: 80px" />
        <Column v-if="showCol('status')" field="status" header="Status" sortable style="min-width: 120px">
          <template #body="{ data }">
            <Tag :value="STATUS_LABELS[data.status as ProspectStatus]" :severity="statusSeverity(data.status)" />
          </template>
        </Column>
        <Column v-if="showCol('followUpDate')" field="followUpDate" header="Follow Up" sortable style="min-width: 110px">
          <template #body="{ data }">{{ formatDate(data.followUpDate) }}</template>
        </Column>
        <Column v-if="showCol('lastContactDate')" field="lastContactDate" header="Last Contact" sortable style="min-width: 120px">
          <template #body="{ data }">{{ formatDate(data.lastContactDate) }}</template>
        </Column>
        <Column header="Actions" style="min-width: 100px">
          <template #body="{ data }">
            <Button
              icon="pi pi-whatsapp"
              rounded
              text
              severity="success"
              v-tooltip.top="'Generate WhatsApp'"
              @click="openWhatsApp(data, $event)"
            />
          </template>
        </Column>
      </DataTable>
    </div>

    <WhatsAppDialog v-model:visible="waVisible" :prospect="waProspect" />
  </div>
</template>
