<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { useTemplateStore } from '@/stores/templates';
import { whatsappApi } from '@/services';
import type { Prospect } from '@/types';
import { renderTemplate } from '@/utils';
import { useCopy } from '@/composables/useCopy';

const visible = defineModel<boolean>('visible', { default: false });
const props = defineProps<{ prospect: Prospect | null }>();

const templates = useTemplateStore();
const { copyText } = useCopy();

const templateId = ref<string | null>(null);
const message = ref('');
const loading = ref(false);
const generatedUrl = ref('');

const selectedTemplate = computed(() => templates.items.find((t) => t.id === templateId.value));

const preview = computed(() => {
  if (!props.prospect) return '';
  const raw = selectedTemplate.value?.message ?? message.value;
  return renderTemplate(raw, {
    company: props.prospect.companyName,
    instagram: props.prospect.instagramHandle,
    website: props.prospect.website,
    phone: props.prospect.phoneNumber,
    score: props.prospect.score,
  });
});

watch(visible, async (v) => {
  if (v) {
    if (!templates.items.length) await templates.fetchAll();
    templateId.value = templates.items[0]?.id ?? null;
    message.value = templates.items[0]?.message ?? '';
    generatedUrl.value = '';
  }
});

watch(templateId, (id) => {
  const t = templates.items.find((x) => x.id === id);
  if (t) message.value = t.message;
});

async function generate() {
  if (!props.prospect) return;
  loading.value = true;
  try {
    const { data } = await whatsappApi.generate({
      prospectId: props.prospect.id,
      templateId: templateId.value ?? undefined,
      message: templateId.value ? undefined : message.value,
    });
    generatedUrl.value = data.url;
    return data.url;
  } finally {
    loading.value = false;
  }
}

async function openLink() {
  const url = generatedUrl.value || (await generate());
  if (url) window.open(url, '_blank', 'noopener');
}

async function copyLink() {
  const url = generatedUrl.value || (await generate());
  if (url) await copyText(url, 'WhatsApp link copied');
}
</script>

<template>
  <Dialog v-model:visible="visible" modal header="Generate WhatsApp" class="w-full max-w-xl">
    <div v-if="!prospect" class="text-sm text-gray-500">No prospect selected</div>
    <div v-else class="space-y-4">
      <div class="text-sm text-gray-600">
        <span class="font-medium text-gray-900">{{ prospect.companyName }}</span>
        · {{ prospect.phoneNumber || 'No phone' }}
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium">Template</label>
        <Select
          v-model="templateId"
          :options="templates.items"
          option-label="name"
          option-value="id"
          placeholder="Choose template"
          class="w-full"
          show-clear
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium">Message</label>
        <Textarea v-model="message" rows="8" class="w-full font-mono text-sm" />
      </div>

      <div class="rounded-xl bg-gray-50 p-3">
        <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</div>
        <pre class="whitespace-pre-wrap text-sm text-gray-800 font-sans">{{ preview }}</pre>
      </div>

      <div class="flex flex-wrap gap-2 justify-end">
        <Button label="Copy link" icon="pi pi-copy" severity="secondary" :loading="loading" :disabled="!prospect.phoneNumber" @click="copyLink" />
        <Button label="Open WhatsApp" icon="pi pi-external-link" :loading="loading" :disabled="!prospect.phoneNumber" @click="openLink" />
      </div>
      <p v-if="!prospect.phoneNumber" class="text-sm text-amber-600">Add a phone number first.</p>
    </div>
  </Dialog>
</template>
