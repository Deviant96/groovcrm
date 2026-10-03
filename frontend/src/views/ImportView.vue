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
import PageHeader from '@/components/ui/PageHeader.vue';

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
    const { data } = await importApi.preview({
      mapping: mapping.value,
      rows: rows.value,
      headers: headers.value,
    });
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
  <div class="max-w-4xl space-y-4">
    <PageHeader
      title="Import CSV"
      subtitle="Map columns, review duplicates, then replace all prospect data."
    />

    <Message severity="warn" :closable="false">
      Confirming import will delete all existing prospects, notes, and activities, then insert the CSV
      rows.
    </Message>

    <div class="flex gap-2 text-sm">
      <span :class="step >= 1 ? 'font-semibold text-gc-primary' : 'text-gc-dimmed'">1. Upload</span>
      <span class="text-gc-dimmed">→</span>
      <span :class="step >= 2 ? 'font-semibold text-gc-primary' : 'text-gc-dimmed'">2. Map</span>
      <span class="text-gc-dimmed">→</span>
      <span :class="step >= 3 ? 'font-semibold text-gc-primary' : 'text-gc-dimmed'">3. Review</span>
    </div>

    <section v-if="step === 1" class="panel p-6">
      <FileUpload
        mode="basic"
        accept=".csv,text/csv"
        choose-label="Choose CSV"
        custom-upload
        auto
        :disabled="loading"
        @select="onSelect"
      />
      <p class="mt-3 text-sm text-gc-text-muted">UTF-8 CSV with a header row.</p>
    </section>

    <section v-else-if="step === 2" class="panel space-y-4 p-6">
      <p class="text-sm text-gc-text-muted">
        {{ rows.length }} rows · {{ headers.length }} columns
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div v-for="field in fields" :key="field.key">
          <label class="mb-1 block text-sm font-medium text-gc-text">
            {{ field.label }}
            <span v-if="'required' in field && field.required" class="text-red-400">*</span>
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
        <Button
          label="Preview duplicates"
          icon="pi pi-eye"
          :loading="loading"
          @click="runPreview"
        />
      </div>
    </section>

    <section v-else class="panel space-y-4 p-6">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-xl bg-gc-elevated p-3">
          <div class="text-xs text-gc-text-muted">Valid rows</div>
          <div class="tnum text-2xl font-semibold text-gc-highlighted">{{ preview?.validRows }}</div>
        </div>
        <div class="rounded-xl bg-gc-elevated p-3">
          <div class="text-xs text-gc-text-muted">Skipped</div>
          <div class="tnum text-2xl font-semibold text-gc-highlighted">
            {{ preview?.skippedRows }}
          </div>
        </div>
        <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div class="text-xs text-amber-400">Duplicates in file</div>
          <div class="tnum text-2xl font-semibold text-amber-400">
            {{ preview?.withinFileDuplicates.length }}
          </div>
        </div>
        <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <div class="text-xs text-amber-400">Match existing DB</div>
          <div class="tnum text-2xl font-semibold text-amber-400">
            {{ preview?.againstDb.length }}
          </div>
        </div>
      </div>

      <p class="text-sm text-gc-text-muted">
        Existing prospects in database:
        <strong class="text-gc-highlighted">{{ preview?.existingCount }}</strong>
        (will be replaced)
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
