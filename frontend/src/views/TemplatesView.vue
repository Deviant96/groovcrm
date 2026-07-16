<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useTemplateStore } from '@/stores/templates';
import { templateApi } from '@/services';
import { CATEGORY_LABELS, type Template, type TemplateCategory } from '@/types';
import { renderTemplate } from '@/utils';

const store = useTemplateStore();
const toast = useToast();
const confirm = useConfirm();

const dialogOpen = ref(false);
const editing = ref<Template | null>(null);
const form = ref({
  name: '',
  category: 'GENERAL' as TemplateCategory,
  message: '',
});

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as TemplateCategory,
  label,
}));

const preview = computed(() =>
  renderTemplate(form.value.message, {
    company: 'Toko Maju',
    instagram: 'tokomaju',
    website: 'https://tokomaju.com',
    phone: '6281234567890',
    score: 85,
  }),
);

onMounted(() => store.fetchAll());

function openCreate() {
  editing.value = null;
  form.value = {
    name: '',
    category: 'GENERAL',
    message: 'Halo {{company}},\n\nKami GroovDev.\n\n',
  };
  dialogOpen.value = true;
}

function openEdit(t: Template) {
  editing.value = t;
  form.value = { name: t.name, category: t.category, message: t.message };
  dialogOpen.value = true;
}

async function save() {
  if (!form.value.name.trim() || !form.value.message.trim()) {
    toast.add({ severity: 'warn', summary: 'Name and message required', life: 2000 });
    return;
  }
  if (editing.value) {
    await templateApi.update(editing.value.id, form.value);
    toast.add({ severity: 'success', summary: 'Template updated', life: 2000 });
  } else {
    await templateApi.create(form.value);
    toast.add({ severity: 'success', summary: 'Template created', life: 2000 });
  }
  dialogOpen.value = false;
  await store.fetchAll();
}

function remove(t: Template) {
  confirm.require({
    message: `Delete template “${t.name}”?`,
    header: 'Confirm',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      await templateApi.remove(t.id);
      toast.add({ severity: 'success', summary: 'Deleted', life: 2000 });
      await store.fetchAll();
    },
  });
}
</script>

<template>
  <div class="gc-page space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Templates</h1>
        <p class="text-sm text-gray-500">
          Variables: <code class="text-green-700">&#123;&#123;company&#125;&#125;</code>
          <code class="text-green-700">&#123;&#123;instagram&#125;&#125;</code>
          <code class="text-green-700">&#123;&#123;website&#125;&#125;</code>
          <code class="text-green-700">&#123;&#123;phone&#125;&#125;</code>
          <code class="text-green-700">&#123;&#123;score&#125;&#125;</code>
        </p>
      </div>
      <Button label="New template" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="store.loading" class="grid gap-4 md:grid-cols-2">
      <Skeleton v-for="i in 4" :key="i" height="10rem" />
    </div>

    <div v-else-if="!store.items.length" class="gc-card px-6 py-16 text-center text-gray-500">
      No templates yet. Create one to speed up WhatsApp outreach.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <article
        v-for="t in store.items"
        :key="t.id"
        class="gc-card p-5 transition hover:shadow-md"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 class="font-semibold text-gray-900">{{ t.name }}</h2>
            <Tag :value="CATEGORY_LABELS[t.category]" severity="success" class="mt-1" />
          </div>
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(t)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="remove(t)" />
          </div>
        </div>
        <pre class="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700 font-sans">{{ t.message }}</pre>
      </article>
    </div>

    <Dialog
      v-model:visible="dialogOpen"
      modal
      :header="editing ? 'Edit template' : 'New template'"
      class="w-full max-w-3xl"
    >
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-sm font-medium">Name</label>
            <InputText v-model="form.name" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Category</label>
            <Select
              v-model="form.category"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium">Message</label>
            <Textarea v-model="form.message" rows="12" class="w-full font-mono text-sm" />
          </div>
        </div>
        <div class="rounded-xl bg-gray-50 p-4">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Live preview</div>
          <pre class="whitespace-pre-wrap text-sm font-sans text-gray-800">{{ preview }}</pre>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogOpen = false" />
        <Button label="Save" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
