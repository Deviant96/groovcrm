<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Select from 'primevue/select';
import FileUpload from 'primevue/fileupload';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { importApi } from '@/services';

type Mapping = {
  companyName: string;
  instagramHandle?: string | null;
  website?: string | null;
  phoneNumber?: string | null;
  sourceUrl?: string | null;
  score?: string | null;
  hasWebsite?: string | null;
  status?: string | null;
  followUpDate?: string | null;
  lastContactDate?: string | null;
  notes?: string | null;
};

const router = useRouter();
const toast = useToast();

const step = ref(1);
const headers = ref<string[]>([]);
const rows = ref<Record<string, string | null>[]>([]);
const mapping = ref<Mapping>({ companyName: '' });
const preview = ref<{
  totalRows: number;
  validRows: number;
  skippedRows: number;
  existingCount: number;
  withinFileDuplicates: unknown[];
  againstDb: unknown[];
} | null>(null);
const loading = ref(false);

const fields = [
  { key: 'companyName', label: 'Company Name', required: true },
  { key: 'instagramHandle', label: 'Instagram Handle' },
  { key: 'website', label: 'Website' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'sourceUrl', label: 'Source URL' },
  { key: 'score', label: 'Score' },
  { key: 'hasWebsite', label: 'Has Website' },
  { key: 'status', label: 'Status' },
  { key: 'followUpDate', label: 'Follow Up Date' },
  { key: 'lastContactDate', label: 'Last Contact Date' },
  { key: 'notes', label: 'Notes' },
] as const;

const headerOptions = computed(() => [
  { label: '— Skip —', value: null },
  ...headers.value.map((h) => ({ label: h, value: h })),
]);

async function onSelect(event: { files: File[] }) {
  const file = event.files?.[0];
  if (!file) return;
  loading.value = true;
  try {
    const { data } = await importApi.parse(file);
    headers.value = data.headers;
    rows.value = data.rows;
    mapping.value = {
      companyName: data.suggestedMapping.companyName ?? '',
      instagramHandle: data.suggestedMapping.instagramHandle ?? null,
      website: data.suggestedMapping.website ?? null,
      phoneNumber: data.suggestedMapping.phoneNumber ?? null,
      sourceUrl: data.suggestedMapping.sourceUrl ?? null,
      score: data.suggestedMapping.score ?? null,
      hasWebsite: data.suggestedMapping.hasWebsite ?? null,
      status: data.suggestedMapping.status ?? null,
      followUpDate: data.suggestedMapping.followUpDate ?? null,
      lastContactDate: data.suggestedMapping.lastContactDate ?? null,
      notes: data.suggestedMapping.notes ?? null,
    };
    step.value = 2;
    toast.add({ severity: 'success', summary: `${data.rowCount} rows loaded`, life: 2000 });
  } finally {
    loading.value = false;
  }
}

async function runPreview() {
  if (!mapping.value.companyName) {
    toast.add({ severity: 'warn', summary: 'Map Company Name', life: 2500 });
    return;
  }
  loading.value = true;
  try {
    const { data } = await importApi.preview({ mapping: mapping.value, rows: rows.value, headers: headers.value });
    preview.value = data;
    step.value = 3;
  } finally {
    loading.value = false;
  }
}

async function confirmImport() {
  loading.value = true;
  try {
    const { data } = await importApi.confirm({ mapping: mapping.value, rows: rows.value });
    toast.add({
      severity: 'success',
      summary: `Imported ${data.imported} prospects`,
      detail: 'Previous prospect data was replaced',
      life: 4000,
    });
    router.push('/prospects');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="gc-page space-y-4 max-w-4xl">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Import CSV</h1>
      <p class="text-sm text-gray-500">
        Map columns, review duplicates, then replace all prospect data.
      </p>
    </div>

    <Message severity="warn" :closable="false">
      Confirming import will delete all existing prospects, notes, and activities, then insert the CSV rows.
    </Message>

    <div class="flex gap-2 text-sm">
      <span :class="step >= 1 ? 'text-green-700 font-semibold' : 'text-gray-400'">1. Upload</span>
      <span class="text-gray-300">→</span>
      <span :class="step >= 2 ? 'text-green-700 font-semibold' : 'text-gray-400'">2. Map</span>
      <span class="text-gray-300">→</span>
      <span :class="step >= 3 ? 'text-green-700 font-semibold' : 'text-gray-400'">3. Review</span>
    </div>

    <section v-if="step === 1" class="gc-card p-6">
      <FileUpload
        mode="basic"
        accept=".csv,text/csv"
        choose-label="Choose CSV"
        custom-upload
        auto
        :disabled="loading"
        @select="onSelect"
      />
      <p class="mt-3 text-sm text-gray-500">UTF-8 CSV with a header row.</p>
    </section>

    <section v-else-if="step === 2" class="gc-card p-6 space-y-4">
      <p class="text-sm text-gray-600">{{ rows.length }} rows · {{ headers.length }} columns</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="field in fields" :key="field.key">
          <label class="mb-1 block text-sm font-medium">
            {{ field.label }}
            <span v-if="'required' in field && field.required" class="text-red-500">*</span>
          </label>
          <Select
            v-model="(mapping as any)[field.key]"
            :options="headerOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :placeholder="field.label"
          />
        </div>
      </div>
      <div class="flex justify-between">
        <Button label="Back" severity="secondary" text @click="step = 1" />
        <Button label="Preview duplicates" icon="pi pi-eye" :loading="loading" @click="runPreview" />
      </div>
    </section>

    <section v-else class="gc-card p-6 space-y-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl bg-gray-50 p-3">
          <div class="text-xs text-gray-500">Valid rows</div>
          <div class="text-2xl font-semibold">{{ preview?.validRows }}</div>
        </div>
        <div class="rounded-xl bg-gray-50 p-3">
          <div class="text-xs text-gray-500">Skipped</div>
          <div class="text-2xl font-semibold">{{ preview?.skippedRows }}</div>
        </div>
        <div class="rounded-xl bg-amber-50 p-3">
          <div class="text-xs text-amber-700">Duplicates in file</div>
          <div class="text-2xl font-semibold text-amber-800">{{ preview?.withinFileDuplicates.length }}</div>
        </div>
        <div class="rounded-xl bg-amber-50 p-3">
          <div class="text-xs text-amber-700">Match existing DB</div>
          <div class="text-2xl font-semibold text-amber-800">{{ preview?.againstDb.length }}</div>
        </div>
      </div>

      <p class="text-sm text-gray-600">
        Existing prospects in database: <strong>{{ preview?.existingCount }}</strong> (will be replaced)
      </p>

      <DataTable
        v-if="preview?.againstDb.length"
        :value="preview.againstDb.slice(0, 20)"
        size="small"
        class="text-sm"
      >
        <Column field="index" header="CSV row" />
        <Column field="companyName" header="Existing company" />
        <Column field="reason" header="Matched by" />
      </DataTable>

      <div class="flex justify-between">
        <Button label="Back" severity="secondary" text @click="step = 2" />
        <Button
          label="Replace & import"
          icon="pi pi-check"
          severity="danger"
          :loading="loading"
          @click="confirmImport"
        />
      </div>
    </section>
  </div>
</template>
