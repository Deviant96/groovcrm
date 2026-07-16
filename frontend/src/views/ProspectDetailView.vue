<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { useProspectStore } from '@/stores/prospects';
import { prospectApi } from '@/services';
import { ACTIVITY_LABELS, STATUS_LABELS, STATUS_OPTIONS, type ProspectStatus } from '@/types';
import { ensureHttp, formatDate, formatDateTime, instagramUrl, statusSeverity } from '@/utils';
import { useCopy } from '@/composables/useCopy';
import InlineEdit from '@/components/InlineEdit.vue';
import WhatsAppDialog from '@/components/WhatsAppDialog.vue';

const route = useRoute();
const router = useRouter();
const store = useProspectStore();
const toast = useToast();
const { copyText } = useCopy();

const noteContent = ref('');
const noteOpen = ref(false);
const statusOpen = ref(false);
const followOpen = ref(false);
const waOpen = ref(false);
const draftStatus = ref<ProspectStatus>('NEW');
const draftFollowUp = ref<Date | null>(null);
const savingNote = ref(false);

const prospect = computed(() => store.current);
const id = computed(() => route.params.id as string);

const timeline = computed(() => {
  if (!prospect.value) return [];
  const notes = (prospect.value.noteEntries ?? []).map((n) => ({
    id: `note-${n.id}`,
    kind: 'note' as const,
    at: n.createdAt,
    title: 'Note',
    body: n.content,
  }));
  const activities = (prospect.value.activities ?? []).map((a) => ({
    id: a.id,
    kind: 'activity' as const,
    at: a.createdAt,
    title: ACTIVITY_LABELS[a.type],
    body: a.metadata ? JSON.stringify(a.metadata) : '',
  }));
  return [...notes, ...activities].sort((a, b) => +new Date(b.at) - +new Date(a.at));
});

onMounted(() => store.fetchOne(id.value));

async function saveField(payload: Record<string, unknown>) {
  await store.updateOne(id.value, payload as never);
  toast.add({ severity: 'success', summary: 'Saved', life: 1500 });
  await store.fetchOne(id.value);
}

async function addNote() {
  if (!noteContent.value.trim()) return;
  savingNote.value = true;
  try {
    await prospectApi.addNote(id.value, noteContent.value.trim());
    noteContent.value = '';
    noteOpen.value = false;
    toast.add({ severity: 'success', summary: 'Note added', life: 2000 });
    await store.fetchOne(id.value);
  } finally {
    savingNote.value = false;
  }
}

async function changeStatus() {
  await saveField({ status: draftStatus.value });
  statusOpen.value = false;
}

async function scheduleFollowUp() {
  await saveField({ followUpDate: draftFollowUp.value ? draftFollowUp.value.toISOString() : null });
  followOpen.value = false;
}

function openExternal(url: string | null) {
  if (!url) {
    toast.add({ severity: 'warn', summary: 'Not available', life: 2000 });
    return;
  }
  window.open(url, '_blank', 'noopener');
}
</script>

<template>
  <div class="gc-page space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <Button icon="pi pi-arrow-left" text rounded severity="secondary" @click="router.push('/prospects')" />
      <div class="grow">
        <h1 class="text-2xl font-semibold tracking-tight">{{ prospect?.companyName ?? 'Prospect' }}</h1>
        <p class="text-sm text-gray-500">Double-click any field to edit · Enter saves · Esc cancels</p>
      </div>
      <Tag v-if="prospect" :value="STATUS_LABELS[prospect.status]" :severity="statusSeverity(prospect.status)" />
    </div>

    <div v-if="store.loading && !prospect" class="grid gap-4 lg:grid-cols-2">
      <Skeleton height="20rem" />
      <Skeleton height="20rem" />
    </div>

    <template v-else-if="prospect">
      <div class="grid gap-4 lg:grid-cols-2">
        <section class="gc-card p-5 space-y-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">Business Information</h2>
          <InlineEdit :model-value="prospect.companyName" label="Company" @save="(v) => saveField({ companyName: v })" />
          <InlineEdit :model-value="prospect.instagramHandle" label="Instagram" @save="(v) => saveField({ instagramHandle: v })" />
          <InlineEdit :model-value="prospect.website" label="Website" @save="(v) => saveField({ website: v })" />
          <InlineEdit :model-value="prospect.phoneNumber" label="Phone" @save="(v) => saveField({ phoneNumber: v })" />
          <InlineEdit :model-value="prospect.sourceUrl" label="Source URL" @save="(v) => saveField({ sourceUrl: v })" />
          <InlineEdit :model-value="prospect.score" label="Score" type="number" @save="(v) => saveField({ score: v })" />
          <InlineEdit :model-value="prospect.hasWebsite" label="Has Website" type="boolean" @save="(v) => saveField({ hasWebsite: v })" />
          <InlineEdit
            :model-value="prospect.status"
            label="Status"
            type="select"
            :options="STATUS_OPTIONS"
            @save="(v) => saveField({ status: v })"
          />
          <InlineEdit :model-value="prospect.followUpDate" label="Follow Up" type="date" @save="(v) => saveField({ followUpDate: v })" />
          <InlineEdit :model-value="prospect.lastContactDate" label="Last Contact" type="date" @save="(v) => saveField({ lastContactDate: v })" />
          <InlineEdit :model-value="prospect.notes" label="Summary notes" type="textarea" @save="(v) => saveField({ notes: v })" />
        </section>

        <section class="gc-card p-5">
          <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Timeline</h2>
          <div v-if="!timeline.length" class="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
            No activity yet
          </div>
          <ol v-else class="relative space-y-4 border-l border-gray-200 pl-4">
            <li v-for="item in timeline" :key="item.id" class="relative">
              <span
                class="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full"
                :class="item.kind === 'note' ? 'bg-green-500' : 'bg-gray-300'"
              />
              <div class="text-xs text-gray-500">{{ formatDateTime(item.at) }}</div>
              <div class="font-medium text-sm">{{ item.title }}</div>
              <div v-if="item.body" class="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{{ item.body }}</div>
            </li>
          </ol>
        </section>
      </div>

      <section class="gc-card p-4">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Quick Actions</h2>
        <div class="flex flex-wrap gap-2">
          <Button label="Generate WhatsApp" icon="pi pi-whatsapp" severity="success" @click="waOpen = true" />
          <Button
            label="Copy Phone"
            icon="pi pi-copy"
            severity="secondary"
            outlined
            :disabled="!prospect.phoneNumber"
            @click="copyText(prospect.phoneNumber!, 'Phone copied')"
          />
          <Button
            label="Open Instagram"
            icon="pi pi-instagram"
            severity="secondary"
            outlined
            @click="openExternal(instagramUrl(prospect.instagramHandle))"
          />
          <Button
            label="Open Website"
            icon="pi pi-globe"
            severity="secondary"
            outlined
            @click="openExternal(ensureHttp(prospect.website))"
          />
          <Button label="Add Note" icon="pi pi-pencil" severity="secondary" outlined @click="noteOpen = true" />
          <Button
            label="Change Status"
            icon="pi pi-sync"
            severity="secondary"
            outlined
            @click="
              draftStatus = prospect.status;
              statusOpen = true;
            "
          />
          <Button
            label="Schedule Follow Up"
            icon="pi pi-calendar"
            severity="secondary"
            outlined
            @click="
              draftFollowUp = prospect.followUpDate ? new Date(prospect.followUpDate) : null;
              followOpen = true;
            "
          />
        </div>
      </section>
    </template>

    <Dialog v-model:visible="noteOpen" header="Add note" modal class="w-full max-w-md">
      <Textarea v-model="noteContent" rows="5" class="w-full" autofocus placeholder="What happened?" />
      <template #footer>
        <Button label="Cancel" text @click="noteOpen = false" />
        <Button label="Save" :loading="savingNote" @click="addNote" />
      </template>
    </Dialog>

    <Dialog v-model:visible="statusOpen" header="Change status" modal class="w-full max-w-sm">
      <Select v-model="draftStatus" :options="STATUS_OPTIONS" option-label="label" option-value="value" class="w-full" />
      <template #footer>
        <Button label="Cancel" text @click="statusOpen = false" />
        <Button label="Update" @click="changeStatus" />
      </template>
    </Dialog>

    <Dialog v-model:visible="followOpen" header="Schedule follow up" modal class="w-full max-w-sm">
      <DatePicker v-model="draftFollowUp" class="w-full" show-icon date-format="dd M yy" />
      <p class="mt-2 text-xs text-gray-500">Current: {{ formatDate(prospect?.followUpDate) }}</p>
      <template #footer>
        <Button label="Clear" text severity="secondary" @click="draftFollowUp = null; scheduleFollowUp()" />
        <Button label="Save" @click="scheduleFollowUp" />
      </template>
    </Dialog>

    <WhatsAppDialog v-model:visible="waOpen" :prospect="prospect" />
  </div>
</template>
