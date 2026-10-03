<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Skeleton from 'primevue/skeleton';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useTemplateStore } from '@/stores/templates';
import { prospectApi, templateApi } from '@/services';
import { CATEGORY_LABELS, type Template, type TemplateCategory } from '@/types';
import { renderTemplate } from '@/utils';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const store = useTemplateStore();
const toast = useToast();
const confirm = useConfirm();

const dialogOpen = ref(false);
const editing = ref<Template | null>(null);
const form = ref({
  name: '',
  category: 'GENERAL' as TemplateCategory,
  prospectCategories: [] as string[],
  message: '',
});

const knownProspectCategories = ref<string[]>([]);
const customCategoryInput = ref('');

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as TemplateCategory,
  label,
}));

const prospectCategoryOptions = computed(() => {
  const set = new Set<string>([...knownProspectCategories.value, ...form.value.prospectCategories]);
  return [...set].sort((a, b) => a.localeCompare(b));
});

const preview = computed(() =>
  renderTemplate(form.value.message, {
    company: 'Toko Maju',
    instagram: 'tokomaju',
    website: 'https://tokomaju.com',
    phone: '6281234567890',
    score: 85,
  }),
);

onMounted(async () => {
  await Promise.all([store.fetchAll(), loadProspectCategories()]);
});

async function loadProspectCategories() {
  try {
    const { data } = await prospectApi.categories();
    knownProspectCategories.value = data;
  } catch {
    knownProspectCategories.value = [];
  }
}

function openCreate() {
  editing.value = null;
  form.value = {
    name: '',
    category: 'GENERAL',
    prospectCategories: [],
    message: 'Halo {{company}},\n\nKami GroovDev.\n\n',
  };
  customCategoryInput.value = '';
  dialogOpen.value = true;
}

function openEdit(t: Template) {
  editing.value = t;
  form.value = {
    name: t.name,
    category: t.category,
    prospectCategories: [...(t.prospectCategories ?? [])],
    message: t.message,
  };
  customCategoryInput.value = '';
  dialogOpen.value = true;
}

function addCustomProspectCategory() {
  const value = customCategoryInput.value.trim();
  if (!value) return;
  const exists = form.value.prospectCategories.some(
    (c) => c.toLowerCase() === value.toLowerCase(),
  );
  if (!exists) {
    form.value.prospectCategories = [...form.value.prospectCategories, value];
  }
  if (!knownProspectCategories.value.some((c) => c.toLowerCase() === value.toLowerCase())) {
    knownProspectCategories.value = [...knownProspectCategories.value, value].sort((a, b) =>
      a.localeCompare(b),
    );
  }
  customCategoryInput.value = '';
}

async function save() {
  if (!form.value.name.trim() || !form.value.message.trim()) {
    toast.add({ severity: 'warn', summary: 'Name and message required', life: 2000 });
    return;
  }
  const payload = {
    name: form.value.name,
    category: form.value.category,
    prospectCategories: form.value.prospectCategories,
    message: form.value.message,
  };
  if (editing.value) {
    await templateApi.update(editing.value.id, payload);
    toast.add({ severity: 'success', summary: 'Template updated', life: 2000 });
  } else {
    await templateApi.create(payload);
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
  <div class="space-y-4">
    <PageHeader title="Templates">
      <template #actions>
        <Button label="New template" icon="pi pi-plus" @click="openCreate" />
      </template>
    </PageHeader>
    <p class="text-sm text-gc-text-muted">
      Variables:
      <code class="text-gc-primary">&#123;&#123;company&#125;&#125;</code>
      <code class="text-gc-primary">&#123;&#123;instagram&#125;&#125;</code>
      <code class="text-gc-primary">&#123;&#123;website&#125;&#125;</code>
      <code class="text-gc-primary">&#123;&#123;phone&#125;&#125;</code>
      <code class="text-gc-primary">&#123;&#123;score&#125;&#125;</code>
    </p>

    <div v-if="store.loading" class="grid gap-4 md:grid-cols-2">
      <Skeleton v-for="i in 4" :key="i" height="10rem" />
    </div>

    <EmptyState
      v-else-if="!store.items.length"
      title="No templates yet"
      description="Create one to speed up WhatsApp outreach."
      icon="pi pi-file"
    >
      <Button label="New template" icon="pi pi-plus" @click="openCreate" />
    </EmptyState>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <article
        v-for="t in store.items"
        :key="t.id"
        class="panel panel-hover p-5"
      >
        <div class="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 class="font-semibold text-gc-highlighted">{{ t.name }}</h2>
            <div class="mt-1 flex flex-wrap gap-1">
              <Tag :value="CATEGORY_LABELS[t.category]" severity="success" />
              <Tag
                v-for="cat in t.prospectCategories ?? []"
                :key="cat"
                :value="cat"
                severity="info"
              />
            </div>
          </div>
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" text rounded size="small" @click="openEdit(t)" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="remove(t)" />
          </div>
        </div>
        <pre class="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-gc-elevated p-3 font-sans text-sm text-gc-text">{{ t.message }}</pre>
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
            <label class="mb-1 block text-sm font-medium text-gc-text">Name</label>
            <InputText v-model="form.name" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gc-text">Message type</label>
            <Select
              v-model="form.category"
              :options="categoryOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gc-text">Prospect categories</label>
            <p class="mb-1.5 text-xs text-gc-text-muted">
              Pin which prospect categories this template should be suggested for when generating WhatsApp
              (e.g. Tour &amp; Travel).
            </p>
            <MultiSelect
              v-model="form.prospectCategories"
              :options="prospectCategoryOptions"
              placeholder="Select prospect categories"
              display="chip"
              filter
              class="w-full"
            />
            <div class="mt-2 flex gap-2">
              <InputText
                v-model="customCategoryInput"
                class="w-full"
                placeholder="Add category name…"
                @keydown.enter.prevent="addCustomProspectCategory"
              />
              <Button label="Add" severity="secondary" @click="addCustomProspectCategory" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-gc-text">Message</label>
            <Textarea v-model="form.message" rows="12" class="w-full font-mono text-sm" />
          </div>
        </div>
        <div class="rounded-xl bg-gc-elevated p-4">
          <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gc-text-muted">Live preview</div>
          <pre class="whitespace-pre-wrap font-sans text-sm text-gc-text">{{ preview }}</pre>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" text @click="dialogOpen = false" />
        <Button label="Save" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
